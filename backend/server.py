from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'rankflow-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Security
security = HTTPBearer()

app = FastAPI(title="RankFlow API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ CONSTANTS ============

ROLES = ["USER", "ADMIN", "SUPER_ADMIN"]
USER_STATUS = ["active", "paused", "blocked"]
PLAN_NAMES = ["free", "starter", "pro", "enterprise"]
PLAN_STATUS = ["active", "overdue", "canceled"]

# Default SUPER_ADMIN credentials
SUPER_ADMIN_EMAIL = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@rankflow.com')
SUPER_ADMIN_PASSWORD = os.environ.get('SUPER_ADMIN_PASSWORD', 'admin123456')

# ============ MODELS ============

# User Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str = "USER"
    status: str = "active"
    created_at: str

class UserFullResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    plan: str
    plan_value: float
    plan_status: str
    plan_expires_at: Optional[str]
    last_login_at: Optional[str]
    created_at: str
    updated_at: str

# User Settings Model
class UserSettingsUpdate(BaseModel):
    monthly_goal: Optional[float] = None
    leads_alert_days: Optional[int] = None  # Dias sem contato para gerar alerta

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    is_impersonating: bool = False
    original_user_id: Optional[str] = None

# Lead Models
PIPELINE_STAGES = ["novo_lead", "contato_feito", "reuniao", "proposta", "fechado", "perdido"]

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    stage: str = "novo_lead"
    contract_value: float = 0.0
    next_contact: Optional[str] = None
    reminder: Optional[str] = None
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    stage: Optional[str] = None
    contract_value: Optional[float] = None
    next_contact: Optional[str] = None
    reminder: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    stage: str
    contract_value: float
    next_contact: Optional[str]
    reminder: Optional[str]
    notes: Optional[str]
    user_id: str
    created_at: str
    updated_at: str

# Client Models
class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    completed: bool = False

class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contract_value: float = 0.0
    plan: str = "recorrente"  # "unico" ou "recorrente"
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    contract_value: Optional[float] = None
    plan: Optional[str] = None
    notes: Optional[str] = None

class WeeklyTask(BaseModel):
    id: str
    title: str
    completed: bool = False

class ClientResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    contract_value: float
    plan: Optional[str]
    notes: Optional[str]
    checklist: List[ChecklistItem]
    weekly_tasks: Optional[List[WeeklyTask]] = []
    weekly_tasks_reset_at: Optional[str] = None
    user_id: str
    created_at: str
    updated_at: str

# Task Models
TASK_TYPES = ["onboarding", "recorrente", "follow_up", "outro"]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = "outro"
    due_date: str
    client_id: Optional[str] = None
    lead_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    task_type: str
    due_date: str
    completed: bool
    client_id: Optional[str]
    client_name: Optional[str]
    lead_id: Optional[str]
    lead_name: Optional[str]
    user_id: str
    created_at: str

# Payment Models
PAYMENT_TYPES = ["pontual", "recorrente"]

class PaymentCreate(BaseModel):
    client_id: str
    description: str
    amount: float
    payment_type: str = "pontual"
    due_date: str
    paid: bool = False

class PaymentUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    payment_type: Optional[str] = None
    due_date: Optional[str] = None
    paid: Optional[bool] = None

class PaymentResponse(BaseModel):
    id: str
    client_id: str
    client_name: Optional[str]
    description: str
    amount: float
    payment_type: str
    due_date: str
    paid: bool
    user_id: str
    created_at: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, original_user_id: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    if original_user_id:
        payload["original_user_id"] = original_user_id
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        if user.get("status") == "blocked":
            raise HTTPException(status_code=403, detail="Usuário bloqueado")
        if user.get("status") == "paused":
            raise HTTPException(status_code=403, detail="Conta pausada temporariamente")
        # Add impersonation info to user object
        user["_original_user_id"] = payload.get("original_user_id")
        user["_is_impersonating"] = payload.get("original_user_id") is not None
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_role(required_roles: List[str]):
    """Factory for role-based access control"""
    async def role_checker(user: dict = Depends(get_current_user)):
        user_role = user.get("role", "USER")
        if user_role not in required_roles:
            raise HTTPException(status_code=403, detail="Acesso negado. Permissão insuficiente.")
        return user
    return role_checker

async def get_super_admin(user: dict = Depends(get_current_user)):
    """Dependency that requires SUPER_ADMIN role"""
    if user.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Acesso restrito a Super Admin")
    return user

async def get_admin_or_super(user: dict = Depends(get_current_user)):
    """Dependency that requires ADMIN or SUPER_ADMIN role"""
    if user.get("role") not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user

# ============ AUDIT LOG HELPER ============

async def create_audit_log(actor: dict, action: str, target_id: str, target_email: str, details: dict = None):
    """Create an audit log entry"""
    log_doc = {
        "id": str(uuid.uuid4()),
        "actor_id": actor.get("id"),
        "actor_email": actor.get("email"),
        "action": action,
        "target_id": target_id,
        "target_email": target_email,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log_doc)
    return log_doc

# ============ INIT SUPER ADMIN ============

async def init_super_admin():
    """Create default SUPER_ADMIN if not exists"""
    existing = await db.users.find_one({"email": SUPER_ADMIN_EMAIL})
    if not existing:
        now = datetime.now(timezone.utc).isoformat()
        admin_doc = {
            "id": str(uuid.uuid4()),
            "name": "Super Admin",
            "email": SUPER_ADMIN_EMAIL,
            "password": hash_password(SUPER_ADMIN_PASSWORD),
            "role": "SUPER_ADMIN",
            "status": "active",
            "plan": "enterprise",
            "plan_value": 0,
            "plan_status": "active",
            "plan_expires_at": None,
            "last_login_at": None,
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Super Admin created: {SUPER_ADMIN_EMAIL}")

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "role": "USER",
        "status": "pending",  # Novo usuário fica pendente até aprovação
        "plan": "free",
        "plan_value": 0,
        "plan_status": "active",
        "plan_expires_at": None,
        "last_login_at": None,
        "created_at": now,
        "updated_at": now
    }
    await db.users.insert_one(user_doc)
    
    return {"message": "Cadastro realizado com sucesso! Aguarde a aprovação do administrador."}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if user.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Usuário bloqueado. Entre em contato com o suporte.")
    
    if user.get("status") == "paused":
        raise HTTPException(status_code=403, detail="Conta pausada temporariamente. Entre em contato com o suporte.")
    
    if user.get("status") == "pending":
        raise HTTPException(status_code=403, detail="Cadastro aguardando aprovação do administrador.")
    
    # Update last login
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_at": now}})
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], 
            name=user["name"], 
            email=user["email"], 
            role=user.get("role", "USER"),
            status=user.get("status", "active"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "USER"),
        "status": user.get("status", "active"),
        "plan": user.get("plan", "free"),
        "created_at": user["created_at"],
        "is_impersonating": user.get("_is_impersonating", False),
        "original_user_id": user.get("_original_user_id")
    }

# ============ USER SETTINGS ============

@api_router.put("/user/settings")
async def update_user_settings(data: UserSettingsUpdate, user: dict = Depends(get_current_user)):
    """Atualizar configurações do usuário (meta mensal, dias de alerta)"""
    update_data = {}
    if data.monthly_goal is not None:
        update_data["settings.monthly_goal"] = data.monthly_goal
    if data.leads_alert_days is not None:
        update_data["settings.leads_alert_days"] = data.leads_alert_days
    
    if update_data:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": update_data}
        )
    
    return {"message": "Configurações atualizadas com sucesso"}

# ============ LEADS ROUTES ============

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(user: dict = Depends(get_current_user)):
    leads = await db.leads.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return leads

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(data: LeadCreate, user: dict = Depends(get_current_user)):
    if data.stage not in PIPELINE_STAGES:
        raise HTTPException(status_code=400, detail="Estágio inválido")
    
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    lead_doc = {
        "id": lead_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "company": data.company,
        "stage": data.stage,
        "contract_value": data.contract_value,
        "next_contact": data.next_contact,
        "reminder": data.reminder,
        "notes": data.notes,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.leads.insert_one(lead_doc)
    
    # Se definiu próximo contato, criar tarefa na agenda automaticamente
    if data.next_contact:
        task_doc = {
            "id": str(uuid.uuid4()),
            "title": f"Follow-up: {data.name}",
            "description": data.reminder or f"Lembrete de contato com {data.name}",
            "task_type": "follow_up",
            "due_date": data.next_contact,
            "completed": False,
            "client_id": None,
            "client_name": None,
            "lead_id": lead_id,
            "lead_name": data.name,
            "user_id": user["id"],
            "created_at": now
        }
        await db.tasks.insert_one(task_doc)
    
    return lead_doc

@api_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, data: LeadUpdate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": user["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    if data.stage and data.stage not in PIPELINE_STAGES:
        raise HTTPException(status_code=400, detail="Estágio inválido")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Se definiu próximo contato, criar tarefa na agenda automaticamente
    if data.next_contact and data.next_contact != lead.get("next_contact"):
        # Verificar se já existe tarefa de follow-up para este lead nesta data
        existing_task = await db.tasks.find_one({
            "lead_id": lead_id,
            "task_type": "follow_up",
            "due_date": data.next_contact,
            "user_id": user["id"]
        })
        
        if not existing_task:
            now = datetime.now(timezone.utc).isoformat()
            task_doc = {
                "id": str(uuid.uuid4()),
                "title": f"Follow-up: {lead['name']}",
                "description": data.reminder or f"Lembrete de contato com {lead['name']}",
                "task_type": "follow_up",
                "due_date": data.next_contact,
                "completed": False,
                "client_id": None,
                "client_name": None,
                "lead_id": lead_id,
                "lead_name": lead["name"],
                "user_id": user["id"],
                "created_at": now
            }
            await db.tasks.insert_one(task_doc)
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return updated

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    return {"message": "Lead excluído com sucesso"}

# Checklist padrão de onboarding (12 etapas)
DEFAULT_ONBOARDING_CHECKLIST = [
    "Criar perfil / Reivindicar acesso",
    "Revisão do Perfil / Editar",
    "Coletar fotos / Imagens",
    "Primeira postagem",
    "Pedir avaliação",
    "Segunda postagem",
    "Responder avaliação",
    "Terceira postagem",
    "Quarta postagem",
    "Responder avaliação",
    "Revisar perfil",
    "Enviar acesso ao cliente",
]

# Checklist semanal padrão (5 itens)
DEFAULT_WEEKLY_CHECKLIST = [
    "Postagem 1 da semana",
    "Postagem 2 da semana",
    "Postagem 3 da semana",
    "Pedido de avaliação",
    "Resposta de avaliação",
]

def generate_checklist(items: list) -> list:
    """Gera checklist com IDs únicos"""
    return [{"id": str(uuid.uuid4()), "title": item, "completed": False} for item in items]

@api_router.post("/leads/{lead_id}/convert", response_model=ClientResponse)
async def convert_lead_to_client(lead_id: str, plan: str = "unico", user: dict = Depends(get_current_user)):
    """Converter lead em cliente. Plan deve ser 'unico' ou 'recorrente'."""
    lead = await db.leads.find_one({"id": lead_id, "user_id": user["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Validar plano
    if plan not in ["unico", "recorrente"]:
        plan = "unico"
    
    # Create client from lead
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Checklist de onboarding completo (12 etapas) - igual para todos os planos
    checklist = generate_checklist(DEFAULT_ONBOARDING_CHECKLIST)
    
    client_doc = {
        "id": client_id,
        "name": lead["name"],
        "email": lead.get("email"),
        "phone": lead.get("phone"),
        "company": lead.get("company"),
        "contract_value": lead.get("contract_value", 0),
        "plan": plan,
        "notes": lead.get("notes"),
        "checklist": checklist,
        "weekly_tasks": [],
        "weekly_tasks_reset_at": now,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.clients.insert_one(client_doc)
    
    # Update lead stage to "fechado"
    await db.leads.update_one({"id": lead_id}, {"$set": {"stage": "fechado", "updated_at": now}})
    
    return client_doc

# ============ CLIENTS ROUTES ============

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(user: dict = Depends(get_current_user)):
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, user: dict = Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Checklist de onboarding completo (12 etapas)
    checklist = generate_checklist(DEFAULT_ONBOARDING_CHECKLIST)
    
    client_doc = {
        "id": client_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "company": data.company,
        "contract_value": data.contract_value,
        "plan": data.plan or "unico",
        "notes": data.notes,
        "checklist": checklist,
        "weekly_tasks": [],
        "weekly_tasks_reset_at": now,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.clients.insert_one(client_doc)
    return client_doc

@api_router.put("/clients/{client_id}/checklist/{item_id}")
async def toggle_checklist_item(client_id: str, item_id: str, user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    checklist = client.get("checklist", [])
    for item in checklist:
        if item["id"] == item_id:
            item["completed"] = not item["completed"]
            break
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"checklist": checklist, "updated_at": now}
    
    # Verificar se todos os 12 itens do checklist foram completados
    # e se o cliente é recorrente - ativar checklist semanal automaticamente
    all_completed = all(item.get("completed", False) for item in checklist)
    is_recorrente = client.get("plan") == "recorrente"
    weekly_tasks = client.get("weekly_tasks", [])
    
    if all_completed and is_recorrente and len(weekly_tasks) == 0:
        # Ativar checklist semanal com os 5 itens padrão
        update_data["weekly_tasks"] = generate_checklist(DEFAULT_WEEKLY_CHECKLIST)
        update_data["weekly_tasks_reset_at"] = now
    
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    response = {"message": "Item atualizado"}
    if all_completed and is_recorrente and len(weekly_tasks) == 0:
        response["weekly_tasks_activated"] = True
        response["message"] = "Checklist completo! Tarefas semanais ativadas automaticamente."
    
    return response

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientUpdate, user: dict = Depends(get_current_user)):
    """Editar informações do cliente"""
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return updated

# ============ OPERATIONS (Painel de Operação) ============

@api_router.get("/operations/stats")
async def get_operations_stats(user: dict = Depends(get_current_user)):
    """Estatísticas de operação: atrasados, pendentes, onboarding incompleto"""
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    week_start = get_week_start()
    
    # Listas de clientes por categoria
    atrasados = []  # Recorrentes com checklist semanal atrasado (semana anterior não completo)
    pendentes_semana = []  # Recorrentes com checklist semanal pendente esta semana
    onboarding_pendente = []  # Únicos com onboarding incompleto
    
    for client in clients:
        plan = client.get("plan", "unico")
        checklist = client.get("checklist", [])
        weekly_tasks = client.get("weekly_tasks", [])
        reset_at = client.get("weekly_tasks_reset_at", "")
        
        # Calcular progresso do onboarding
        checklist_total = len(checklist)
        checklist_done = sum(1 for item in checklist if item.get("completed", False))
        onboarding_completo = checklist_total > 0 and checklist_done == checklist_total
        
        if plan == "recorrente" and onboarding_completo and len(weekly_tasks) > 0:
            # Verificar status do checklist semanal
            weekly_total = len(weekly_tasks)
            weekly_done = sum(1 for task in weekly_tasks if task.get("completed", False))
            weekly_completo = weekly_total > 0 and weekly_done == weekly_total
            
            # Se reset_at é anterior a esta semana e não completou = ATRASADO
            if reset_at < week_start and not weekly_completo:
                atrasados.append({
                    "id": client["id"],
                    "name": client["name"],
                    "company": client.get("company"),
                    "phone": client.get("phone"),
                    "weekly_progress": f"{weekly_done}/{weekly_total}",
                    "last_reset": reset_at
                })
            # Se reset_at é desta semana e não completou = PENDENTE NA SEMANA
            elif reset_at >= week_start and not weekly_completo:
                pendentes_semana.append({
                    "id": client["id"],
                    "name": client["name"],
                    "company": client.get("company"),
                    "phone": client.get("phone"),
                    "weekly_progress": f"{weekly_done}/{weekly_total}"
                })
        
        elif plan == "unico" and not onboarding_completo:
            # Cliente único com onboarding incompleto
            onboarding_pendente.append({
                "id": client["id"],
                "name": client["name"],
                "company": client.get("company"),
                "phone": client.get("phone"),
                "checklist_progress": f"{checklist_done}/{checklist_total}"
            })
    
    return {
        "atrasados": atrasados,
        "pendentes_semana": pendentes_semana,
        "onboarding_pendente": onboarding_pendente,
        "counts": {
            "atrasados": len(atrasados),
            "pendentes_semana": len(pendentes_semana),
            "onboarding_pendente": len(onboarding_pendente)
        }
    }

# ============ WEEKLY TASKS (Tarefas da Semana do Cliente) ============

def get_week_start():
    """Retorna a data de início da semana atual (segunda-feira)"""
    today = datetime.now(timezone.utc).date()
    days_since_monday = today.weekday()
    monday = today - timedelta(days=days_since_monday)
    return datetime.combine(monday, datetime.min.time(), tzinfo=timezone.utc).isoformat()

@api_router.get("/clients/{client_id}/weekly-tasks")
async def get_weekly_tasks(client_id: str, user: dict = Depends(get_current_user)):
    """Obter tarefas da semana do cliente (com reset automático)"""
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    weekly_tasks = client.get("weekly_tasks", [])
    reset_at = client.get("weekly_tasks_reset_at", "")
    week_start = get_week_start()
    
    # Verificar se precisa resetar (nova semana começou)
    if reset_at < week_start:
        # Reset: marcar todas as tarefas como não concluídas
        for task in weekly_tasks:
            task["completed"] = False
        
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"weekly_tasks": weekly_tasks, "weekly_tasks_reset_at": week_start}}
        )
    
    return {"weekly_tasks": weekly_tasks, "reset_at": week_start}

@api_router.post("/clients/{client_id}/weekly-tasks")
async def add_weekly_task(client_id: str, title: str = "", user: dict = Depends(get_current_user)):
    """Adicionar tarefa da semana"""
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    weekly_tasks = client.get("weekly_tasks", [])
    new_task = {
        "id": str(uuid.uuid4()),
        "title": title,
        "completed": False
    }
    weekly_tasks.append(new_task)
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"weekly_tasks": weekly_tasks, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return new_task

@api_router.put("/clients/{client_id}/weekly-tasks/{task_id}")
async def update_weekly_task(client_id: str, task_id: str, title: Optional[str] = None, completed: Optional[bool] = None, user: dict = Depends(get_current_user)):
    """Atualizar tarefa da semana (editar título ou marcar concluída)"""
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    weekly_tasks = client.get("weekly_tasks", [])
    for task in weekly_tasks:
        if task["id"] == task_id:
            if title is not None:
                task["title"] = title
            if completed is not None:
                task["completed"] = completed
            break
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"weekly_tasks": weekly_tasks, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Tarefa atualizada"}

@api_router.delete("/clients/{client_id}/weekly-tasks/{task_id}")
async def delete_weekly_task(client_id: str, task_id: str, user: dict = Depends(get_current_user)):
    """Excluir tarefa da semana"""
    client = await db.clients.find_one({"id": client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    weekly_tasks = [t for t in client.get("weekly_tasks", []) if t["id"] != task_id]
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"weekly_tasks": weekly_tasks, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Tarefa excluída"}

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    # Also delete related tasks and payments
    await db.tasks.delete_many({"client_id": client_id})
    await db.payments.delete_many({"client_id": client_id})
    return {"message": "Cliente excluído com sucesso"}

# ============ TASKS ROUTES ============

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(filter: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    
    today = datetime.now(timezone.utc).date()
    week_end = today + timedelta(days=7)
    
    if filter == "today":
        query["due_date"] = {"$lte": datetime.combine(today, datetime.max.time()).isoformat()}
        query["completed"] = False
    elif filter == "week":
        query["due_date"] = {"$lte": datetime.combine(week_end, datetime.max.time()).isoformat()}
        query["completed"] = False
    elif filter == "followups":
        query["task_type"] = "follow_up"
        query["completed"] = False
    elif filter == "pending":
        query["completed"] = False
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return tasks

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client_name = None
    lead_name = None
    
    if data.client_id:
        client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
        client_name = client["name"] if client else None
    
    if data.lead_id:
        lead = await db.leads.find_one({"id": data.lead_id}, {"_id": 0})
        lead_name = lead["name"] if lead else None
    
    task_doc = {
        "id": task_id,
        "title": data.title,
        "description": data.description,
        "task_type": data.task_type,
        "due_date": data.due_date,
        "completed": False,
        "client_id": data.client_id,
        "client_name": client_name,
        "lead_id": data.lead_id,
        "lead_name": lead_name,
        "user_id": user["id"],
        "created_at": now
    }
    await db.tasks.insert_one(task_doc)
    return task_doc

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return {"message": "Tarefa excluída com sucesso"}

# ============ PAYMENTS ROUTES ============

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return payments

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate, user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": data.client_id, "user_id": user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    payment_doc = {
        "id": payment_id,
        "client_id": data.client_id,
        "client_name": client["name"],
        "description": data.description,
        "amount": data.amount,
        "payment_type": data.payment_type,
        "due_date": data.due_date,
        "paid": data.paid,
        "user_id": user["id"],
        "created_at": now
    }
    await db.payments.insert_one(payment_doc)
    return payment_doc

@api_router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(payment_id: str, data: PaymentUpdate, user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id, "user_id": user["id"]}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    return updated

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(get_current_user)):
    result = await db.payments.delete_one({"id": payment_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return {"message": "Pagamento excluído com sucesso"}

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today = now.date()
    current_month = now.month
    current_year = now.year
    
    # Configurações do usuário
    user_settings = user.get("settings", {})
    monthly_goal = user_settings.get("monthly_goal", 0)
    leads_alert_days = user_settings.get("leads_alert_days", 7)
    
    # Count leads by stage
    leads = await db.leads.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    leads_by_stage = {}
    total_pipeline_value = 0
    
    # Alertas de leads sem contato
    alerts = []
    stale_leads_count = 0
    cutoff_date = now - timedelta(days=leads_alert_days)
    
    for lead in leads:
        stage = lead.get("stage", "novo_lead")
        leads_by_stage[stage] = leads_by_stage.get(stage, 0) + 1
        if stage not in ["perdido", "fechado"]:
            total_pipeline_value += lead.get("contract_value", 0)
            # Verificar leads parados
            updated_at = lead.get("updated_at", lead.get("created_at", ""))
            if updated_at:
                lead_date = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                if lead_date < cutoff_date:
                    stale_leads_count += 1
    
    if stale_leads_count > 0:
        alerts.append({
            "type": "warning",
            "title": "Leads parados",
            "message": f"{stale_leads_count} lead(s) sem contato há mais de {leads_alert_days} dias"
        })
    
    # Count clients e clientes fechados no mês
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    clients_count = len(clients)
    clients_closed_this_month = 0
    
    for client in clients:
        created_at = client.get("created_at", "")
        if created_at:
            client_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if client_date.month == current_month and client_date.year == current_year:
                clients_closed_this_month += 1
    
    # Tasks stats
    tasks = await db.tasks.find({"user_id": user["id"], "completed": False}, {"_id": 0}).to_list(1000)
    tasks_today = 0
    tasks_pending = len(tasks)
    tasks_today_list = []
    
    for task in tasks:
        due_date_str = task.get("due_date", "")
        if due_date_str:
            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00")).date()
            if due_date <= today:
                tasks_today += 1
                if len(tasks_today_list) < 5:
                    tasks_today_list.append({
                        "id": task["id"],
                        "title": task["title"],
                        "type": task.get("task_type", "outro"),
                        "due_date": due_date_str
                    })
    
    # Financial stats
    payments = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    monthly_revenue = 0
    pending_revenue = 0
    overdue_clients = set()
    
    for payment in payments:
        due_date_str = payment.get("due_date", "")
        if due_date_str:
            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
            if due_date.month == current_month and due_date.year == current_year:
                if payment.get("paid"):
                    monthly_revenue += payment.get("amount", 0)
                else:
                    pending_revenue += payment.get("amount", 0)
            # Verificar inadimplentes
            if not payment.get("paid") and due_date.date() < today:
                client_id = payment.get("client_id")
                if client_id:
                    overdue_clients.add(client_id)
    
    # Alerta de inadimplentes
    if overdue_clients:
        alerts.append({
            "type": "error",
            "title": "Clientes inadimplentes",
            "message": f"{len(overdue_clients)} cliente(s) com pagamento em atraso"
        })
    
    # Alerta de meta
    goal_percentage = (monthly_revenue / monthly_goal * 100) if monthly_goal > 0 else 0
    if monthly_goal > 0 and goal_percentage < 100:
        alerts.append({
            "type": "info",
            "title": "Meta do mês",
            "message": f"Faltam R$ {monthly_goal - monthly_revenue:,.2f} para atingir a meta"
        })
    
    # Limitar a 3 alertas
    alerts = alerts[:3]
    
    return {
        "leads_total": len(leads),
        "leads_by_stage": leads_by_stage,
        "total_pipeline_value": total_pipeline_value,
        "clients_count": clients_count,
        "clients_closed_this_month": clients_closed_this_month,
        "tasks_today": tasks_today,
        "tasks_pending": tasks_pending,
        "tasks_today_list": tasks_today_list,
        "monthly_revenue": monthly_revenue,
        "pending_revenue": pending_revenue,
        "monthly_goal": monthly_goal,
        "goal_percentage": min(goal_percentage, 100),
        "alerts": alerts,
        "settings": {
            "monthly_goal": monthly_goal,
            "leads_alert_days": leads_alert_days
        }
    }

# ============ ADMIN ROUTES ============

# Admin Models
class UserStatusUpdate(BaseModel):
    status: str  # "active" | "blocked"

class UserRoleUpdate(BaseModel):
    role: str  # "USER" | "ADMIN" | "SUPER_ADMIN"

class UserPlanUpdate(BaseModel):
    plan: str
    plan_value: float
    plan_status: str
    plan_expires_at: Optional[str] = None

# Check if user is admin
@api_router.get("/admin/check")
async def check_admin(user: dict = Depends(get_current_user)):
    """Check if current user has admin access"""
    return {
        "is_admin": user.get("role") in ["ADMIN", "SUPER_ADMIN"],
        "is_super_admin": user.get("role") == "SUPER_ADMIN",
        "role": user.get("role", "USER")
    }

# Admin Dashboard Stats
@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_super_admin)):
    """Get global stats for admin dashboard"""
    # Count users
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    blocked_users = await db.users.count_documents({"status": "blocked"})
    
    # Count by plan
    users_by_plan = {}
    for plan in PLAN_NAMES:
        count = await db.users.count_documents({"plan": plan})
        users_by_plan[plan] = count
    
    # Count clients and leads (global)
    total_clients = await db.clients.count_documents({})
    total_leads = await db.leads.count_documents({})
    total_tasks = await db.tasks.count_documents({})
    
    # MRR calculation (sum of all active recurring plan values)
    pipeline = [
        {"$match": {"plan_status": "active", "plan_value": {"$gt": 0}}},
        {"$group": {"_id": None, "mrr": {"$sum": "$plan_value"}}}
    ]
    mrr_result = await db.users.aggregate(pipeline).to_list(1)
    mrr = mrr_result[0]["mrr"] if mrr_result else 0
    
    # Overdue count
    overdue_count = await db.users.count_documents({"plan_status": "overdue"})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "blocked_users": blocked_users,
        "users_by_plan": users_by_plan,
        "total_clients": total_clients,
        "total_leads": total_leads,
        "total_tasks": total_tasks,
        "mrr": mrr,
        "overdue_count": overdue_count
    }

# Recent Events
@api_router.get("/admin/events")
async def get_admin_events(admin: dict = Depends(get_super_admin), limit: int = 10):
    """Get recent system events"""
    events = []
    
    # Recent users
    recent_users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for u in recent_users:
        events.append({
            "type": "new_user",
            "message": f"Novo usuário: {u['name']}",
            "email": u["email"],
            "timestamp": u["created_at"]
        })
    
    # Recent clients
    recent_clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for c in recent_clients:
        events.append({
            "type": "new_client",
            "message": f"Novo cliente: {c['name']}",
            "timestamp": c["created_at"]
        })
    
    # Recent audit logs
    recent_logs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for log in recent_logs:
        events.append({
            "type": "audit",
            "message": f"{log['action']}: {log['target_email']}",
            "actor": log["actor_email"],
            "timestamp": log["created_at"]
        })
    
    # Sort all events by timestamp and return top N
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:limit]

# List Users (Admin)
@api_router.get("/admin/users")
async def list_users(
    admin: dict = Depends(get_super_admin),
    search: Optional[str] = None,
    status: Optional[str] = None,
    plan: Optional[str] = None,
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """List all users with filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    if plan:
        query["plan"] = plan
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "skip": skip, "limit": limit}

# Listar Usuários Pendentes (DEVE VIR ANTES DE /admin/users/{user_id})
@api_router.get("/admin/users/pending")
async def get_pending_users(admin: dict = Depends(get_super_admin)):
    """List all pending users awaiting approval"""
    users = await db.users.find({"status": "pending"}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(100)
    return users

# Get User Details (Admin)
@api_router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, admin: dict = Depends(get_super_admin)):
    """Get detailed user information"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Get user stats
    clients_count = await db.clients.count_documents({"user_id": user_id})
    leads_count = await db.leads.count_documents({"user_id": user_id})
    tasks_count = await db.tasks.count_documents({"user_id": user_id})
    
    # Get payments total
    payments = await db.payments.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    payments_total = sum(p["amount"] for p in payments if p.get("paid"))
    
    return {
        **user,
        "stats": {
            "clients_count": clients_count,
            "leads_count": leads_count,
            "tasks_count": tasks_count,
            "payments_total": payments_total
        }
    }

# Update User Status (Block/Unblock)
@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, data: UserStatusUpdate, admin: dict = Depends(get_super_admin)):
    """Block or unblock a user"""
    if data.status not in USER_STATUS:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Prevent blocking yourself or other super admins
    if user.get("role") == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Não é possível alterar status de um Super Admin")
    
    old_status = user.get("status", "active")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Audit log
    action_map = {
        "blocked": "block_user",
        "paused": "pause_user", 
        "active": "activate_user",
        "pending": "set_pending"
    }
    action = action_map.get(data.status, "update_status")
    await create_audit_log(admin, action, user_id, user["email"], {"old_status": old_status, "new_status": data.status})
    
    status_messages = {
        "blocked": "bloqueado",
        "paused": "pausado",
        "active": "ativado",
        "pending": "marcado como pendente"
    }
    return {"message": f"Usuário {status_messages.get(data.status, 'atualizado')} com sucesso"}

# Aprovar Usuário Pendente
@api_router.post("/admin/users/{user_id}/approve")
async def approve_user(user_id: str, admin: dict = Depends(get_super_admin)):
    """Approve a pending user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Usuário não está pendente")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(admin, "approve_user", user_id, user["email"], {"action": "approved"})
    return {"message": f"Usuário {user['name']} aprovado com sucesso"}

# Rejeitar Usuário Pendente  
@api_router.post("/admin/users/{user_id}/reject")
async def reject_user(user_id: str, admin: dict = Depends(get_super_admin)):
    """Reject a pending user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Usuário não está pendente")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "blocked", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await create_audit_log(admin, "reject_user", user_id, user["email"], {"action": "rejected"})
    return {"message": f"Usuário {user['name']} rejeitado"}

# Update User Role
@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, data: UserRoleUpdate, admin: dict = Depends(get_super_admin)):
    """Change user role"""
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Role inválida")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Prevent removing last SUPER_ADMIN
    if user.get("role") == "SUPER_ADMIN" and data.role != "SUPER_ADMIN":
        super_admin_count = await db.users.count_documents({"role": "SUPER_ADMIN"})
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="Não é possível remover o último Super Admin")
    
    old_role = user.get("role", "USER")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Audit log
    await create_audit_log(admin, "change_role", user_id, user["email"], {"old_role": old_role, "new_role": data.role})
    
    return {"message": f"Role alterada para {data.role}"}

# Update User Plan
@api_router.put("/admin/users/{user_id}/plan")
async def update_user_plan(user_id: str, data: UserPlanUpdate, admin: dict = Depends(get_super_admin)):
    """Change user subscription plan"""
    if data.plan not in PLAN_NAMES:
        raise HTTPException(status_code=400, detail="Plano inválido")
    if data.plan_status not in PLAN_STATUS:
        raise HTTPException(status_code=400, detail="Status de plano inválido")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    old_plan = user.get("plan", "free")
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "plan": data.plan,
        "plan_value": data.plan_value,
        "plan_status": data.plan_status,
        "updated_at": now
    }
    if data.plan_expires_at:
        update_data["plan_expires_at"] = data.plan_expires_at
    if data.plan_status == "active":
        update_data["last_payment_at"] = now
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Audit log
    await create_audit_log(admin, "change_plan", user_id, user["email"], {
        "old_plan": old_plan,
        "new_plan": data.plan,
        "plan_value": data.plan_value,
        "plan_status": data.plan_status
    })
    
    return {"message": f"Plano alterado para {data.plan}"}

# Impersonate User
@api_router.post("/admin/impersonate/{user_id}")
async def impersonate_user(user_id: str, admin: dict = Depends(get_super_admin)):
    """Generate a token to impersonate a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("role") == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Não é possível impersonar outro Super Admin")
    
    # Create token with original_user_id
    token = create_token(user_id, original_user_id=admin["id"])
    
    # Audit log
    await create_audit_log(admin, "impersonate", user_id, user["email"], {})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "USER"),
            "status": user.get("status", "active"),
            "created_at": user["created_at"]
        },
        "is_impersonating": True,
        "original_user_id": admin["id"]
    }

# Exit Impersonation
@api_router.post("/admin/exit-impersonate")
async def exit_impersonate(user: dict = Depends(get_current_user)):
    """Return to original admin account"""
    original_user_id = user.get("_original_user_id")
    if not original_user_id:
        raise HTTPException(status_code=400, detail="Você não está em modo de impersonação")
    
    original_user = await db.users.find_one({"id": original_user_id}, {"_id": 0, "password": 0})
    if not original_user:
        raise HTTPException(status_code=404, detail="Usuário original não encontrado")
    
    token = create_token(original_user_id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": original_user["id"],
            "name": original_user["name"],
            "email": original_user["email"],
            "role": original_user.get("role", "USER"),
            "status": original_user.get("status", "active"),
            "created_at": original_user["created_at"]
        },
        "is_impersonating": False
    }

# Get Audit Logs
@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    admin: dict = Depends(get_super_admin),
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get audit logs"""
    query = {}
    if action:
        query["action"] = action
    
    logs = await db.audit_logs.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)
    total = await db.audit_logs.count_documents(query)
    
    return {"logs": logs, "total": total}

# Admin Models for new endpoints
class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "USER"
    plan: str = "free"
    plan_value: float = 0

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class AdminPasswordReset(BaseModel):
    new_password: str

# Create User (Admin)
@api_router.post("/admin/users")
async def admin_create_user(data: AdminUserCreate, admin: dict = Depends(get_super_admin)):
    """Create a new user manually"""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail="Role inválida")
    if data.plan not in PLAN_NAMES:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "role": data.role,
        "status": "active",
        "plan": data.plan,
        "plan_value": data.plan_value,
        "plan_status": "active",
        "plan_expires_at": None,
        "last_login_at": None,
        "created_at": now,
        "updated_at": now
    }
    await db.users.insert_one(user_doc)
    
    # Audit log
    await create_audit_log(admin, "create_user", user_id, data.email, {"role": data.role, "plan": data.plan})
    
    return {"message": "Usuário criado com sucesso", "user_id": user_id}

# Update User Profile (Admin)
@api_router.put("/admin/users/{user_id}/profile")
async def admin_update_user_profile(user_id: str, data: AdminUserUpdate, admin: dict = Depends(get_super_admin)):
    """Update user name and email"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    changes = {}
    
    if data.name:
        changes["old_name"] = user["name"]
        changes["new_name"] = data.name
        update_data["name"] = data.name
    
    if data.email:
        # Check if email already exists
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado por outro usuário")
        changes["old_email"] = user["email"]
        changes["new_email"] = data.email
        update_data["email"] = data.email
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Audit log
    await create_audit_log(admin, "update_profile", user_id, user["email"], changes)
    
    return {"message": "Perfil atualizado com sucesso"}

# Reset User Password (Admin)
@api_router.put("/admin/users/{user_id}/password")
async def admin_reset_user_password(user_id: str, data: AdminPasswordReset, admin: dict = Depends(get_super_admin)):
    """Reset user password"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Audit log
    await create_audit_log(admin, "reset_password", user_id, user["email"], {})
    
    return {"message": "Senha redefinida com sucesso"}

# Delete User (Admin)
@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_super_admin)):
    """Delete a user and all their data"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("role") == "SUPER_ADMIN":
        super_admin_count = await db.users.count_documents({"role": "SUPER_ADMIN"})
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="Não é possível excluir o último Super Admin")
    
    # Delete user data
    await db.leads.delete_many({"user_id": user_id})
    await db.clients.delete_many({"user_id": user_id})
    await db.tasks.delete_many({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    # Audit log
    await create_audit_log(admin, "delete_user", user_id, user["email"], {"name": user["name"]})
    
    return {"message": "Usuário e dados excluídos com sucesso"}

# ============ STRIPE PAYMENT / COBRANÇA ============

class CreateChargeRequest(BaseModel):
    client_id: str
    amount: float
    description: str
    due_date: str

class ChargeResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    amount: float
    description: str
    due_date: str
    status: str
    payment_link: Optional[str]
    session_id: Optional[str]
    created_at: str

@api_router.post("/charges/create")
async def create_charge(request: Request, data: CreateChargeRequest, user: dict = Depends(get_current_user)):
    """Cria uma cobrança com link de pagamento Stripe"""
    # Verificar se cliente existe
    client_doc = await db.clients.find_one({"id": data.client_id, "user_id": user["id"]}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Obter URL base do frontend
    origin = request.headers.get("origin", request.headers.get("referer", ""))
    if not origin:
        origin = str(request.base_url).rstrip("/")
    
    # URLs de sucesso e cancelamento
    success_url = f"{origin}/clients/{data.client_id}?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/clients/{data.client_id}?payment=cancelled"
    
    # Criar checkout session no Stripe
    try:
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        checkout_request = CheckoutSessionRequest(
            amount=float(data.amount),
            currency="brl",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "client_id": data.client_id,
                "client_name": client_doc["name"],
                "description": data.description,
                "user_id": user["id"]
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        payment_link = session.url
        session_id = session.session_id
    except Exception as e:
        logger.error(f"Erro ao criar checkout Stripe: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar link de pagamento: {str(e)}")
    
    # Criar registro na collection payment_transactions
    charge_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    charge_doc = {
        "id": charge_id,
        "client_id": data.client_id,
        "client_name": client_doc["name"],
        "amount": float(data.amount),
        "description": data.description,
        "due_date": data.due_date,
        "status": "pendente",
        "payment_status": "pending",
        "payment_link": payment_link,
        "session_id": session_id,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.payment_transactions.insert_one(charge_doc)
    
    return {
        "id": charge_id,
        "client_id": data.client_id,
        "client_name": client_doc["name"],
        "amount": float(data.amount),
        "description": data.description,
        "due_date": data.due_date,
        "status": "pendente",
        "payment_link": payment_link,
        "session_id": session_id,
        "created_at": now
    }

@api_router.get("/charges/client/{client_id}")
async def get_client_charges(client_id: str, user: dict = Depends(get_current_user)):
    """Lista cobranças de um cliente"""
    charges = await db.payment_transactions.find(
        {"client_id": client_id, "user_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return charges

@api_router.get("/charges/status/{session_id}")
async def check_charge_status(request: Request, session_id: str, user: dict = Depends(get_current_user)):
    """Verifica status do pagamento no Stripe"""
    try:
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        status_response: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Atualizar status na collection
        new_status = "pago" if status_response.payment_status == "paid" else "pendente"
        if status_response.status == "expired":
            new_status = "cancelado"
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": new_status,
                "payment_status": status_response.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "status": new_status,
            "payment_status": status_response.payment_status,
            "amount": status_response.amount_total / 100,  # centavos para reais
            "currency": status_response.currency
        }
    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao verificar status: {str(e)}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Webhook para receber notificações do Stripe"""
    try:
        body = await request.body()
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, request.headers.get("Stripe-Signature"))
        
        if webhook_response and webhook_response.session_id:
            new_status = "pago" if webhook_response.payment_status == "paid" else "pendente"
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "status": new_status,
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============ DASHBOARD STATS EXTENDED ============

@api_router.get("/dashboard/operational-stats")
async def get_operational_stats(user: dict = Depends(get_current_user)):
    """Estatísticas operacionais para o dashboard"""
    # Contar clientes por plano
    clients = await db.clients.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    recorrentes = sum(1 for c in clients if c.get("plan") == "recorrente")
    unicos = sum(1 for c in clients if c.get("plan") != "recorrente")
    
    # Pagamentos pendentes (payments collection)
    pagamentos_pendentes = await db.payments.count_documents({
        "user_id": user["id"],
        "paid": False
    })
    
    # Cobranças pendentes (payment_transactions)
    cobrancas_pendentes = await db.payment_transactions.count_documents({
        "user_id": user["id"],
        "status": "pendente"
    })
    
    # Checklists atrasados (da API de operations)
    week_start = get_week_start()
    atrasados = 0
    
    for client in clients:
        if client.get("plan") == "recorrente":
            checklist = client.get("checklist", [])
            checklist_completo = all(item.get("completed", False) for item in checklist) if checklist else False
            
            if checklist_completo:
                weekly_tasks = client.get("weekly_tasks", [])
                reset_at = client.get("weekly_tasks_reset_at", "")
                
                if weekly_tasks:
                    weekly_completo = all(task.get("completed", False) for task in weekly_tasks)
                    if reset_at < week_start and not weekly_completo:
                        atrasados += 1
    
    return {
        "clientes_recorrentes": recorrentes,
        "clientes_unicos": unicos,
        "pagamentos_pendentes": pagamentos_pendentes + cobrancas_pendentes,
        "checklists_atrasados": atrasados
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize database and create super admin"""
    await init_super_admin()
    logger.info("RankFlow API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
