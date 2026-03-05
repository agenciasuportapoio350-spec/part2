# MAPA DE ARQUITETURA - RankFlow

## Visão Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RANKFLOW SYSTEM                                 │
│                    Sistema de Gestão para Google Empresas                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    FRONTEND     │────▶│     BACKEND     │────▶│    DATABASE     │
│   React + TW    │     │    FastAPI      │     │    MongoDB      │
│   Port: 3000    │     │   Port: 8001    │     │   Port: 27017   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 1. ARQUITETURA DE CAMADAS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         React Frontend                                │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│  │  │ Login   │ │Dashboard│ │   CRM   │ │ Clients │ │ Agenda  │        │   │
│  │  │  Page   │ │  Page   │ │  Page   │ │  Page   │ │  Page   │        │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │   │
│  │  │ Finance │ │  Admin  │ │  Admin  │ │  Admin  │                    │   │
│  │  │  Page   │ │Dashboard│ │  Users  │ │  Audit  │                    │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼ HTTP/REST (Axios)
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      FastAPI Backend                                  │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │    AUTH     │  │    LEADS    │  │   CLIENTS   │                   │   │
│  │  │  /api/auth  │  │  /api/leads │  │ /api/clients│                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │    TASKS    │  │  PAYMENTS   │  │  DASHBOARD  │                   │   │
│  │  │  /api/tasks │  │/api/payments│  │/api/dashboard│                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  │  ┌─────────────┐                                                      │   │
│  │  │    ADMIN    │                                                      │   │
│  │  │  /api/admin │                                                      │   │
│  │  └─────────────┘                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼ Motor (Async MongoDB Driver)
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        MongoDB Database                               │   │
│  │                                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│  │  │  users  │ │  leads  │ │ clients │ │  tasks  │ │payments │        │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │   │
│  │  ┌───────────┐                                                       │   │
│  │  │audit_logs │                                                       │   │
│  │  └───────────┘                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA DE DIRETÓRIOS

```
/app/
│
├── backend/
│   ├── server.py              # API FastAPI principal (1552 linhas)
│   ├── requirements.txt       # Dependências Python
│   └── .env                   # MONGO_URL, DB_NAME, CORS_ORIGINS
│
├── frontend/
│   ├── public/
│   │   ├── index.html         # HTML base
│   │   ├── logo-full.png      # Logo completo
│   │   └── logo-login.png     # Logo para login
│   │
│   ├── src/
│   │   ├── index.js           # Entry point React
│   │   ├── index.css          # Estilos globais + Tailwind
│   │   ├── App.js             # Rotas e providers
│   │   ├── App.css            # Estilos customizados
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.js # Context de autenticação
│   │   │
│   │   ├── lib/
│   │   │   ├── api.js         # Axios configurado
│   │   │   └── utils.js       # Helpers (formatCurrency, formatDate, etc)
│   │   │
│   │   ├── hooks/
│   │   │   └── use-toast.js   # Hook de toast
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.js      # Layout principal com sidebar
│   │   │   ├── AdminLayout.js # Layout do admin
│   │   │   ├── ErrorBoundary.js
│   │   │   └── ui/            # 46 componentes Shadcn UI
│   │   │       ├── button.jsx
│   │   │       ├── card.jsx
│   │   │       ├── dialog.jsx
│   │   │       ├── input.jsx
│   │   │       ├── select.jsx
│   │   │       ├── table.jsx
│   │   │       ├── tabs.jsx
│   │   │       └── ... (39 mais)
│   │   │
│   │   └── pages/
│   │       ├── LoginPage.js
│   │       ├── DashboardPage.js
│   │       ├── CRMPage.js
│   │       ├── ClientsPage.js
│   │       ├── ClientDetailPage.js
│   │       ├── AgendaPage.js
│   │       ├── FinancePage.js
│   │       └── admin/
│   │           ├── AdminDashboardPage.js
│   │           ├── AdminUsersPage.js
│   │           ├── AdminUserDetailPage.js
│   │           └── AdminAuditPage.js
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env                   # REACT_APP_BACKEND_URL
│
├── memory/
│   └── PRD.md                 # Product Requirements Document
│
├── test_reports/              # Relatórios de teste
│
├── AUDITORIA_TECNICA.md       # Auditoria do sistema
├── ARQUITETURA_SISTEMA.md     # Este arquivo
└── design_guidelines.json     # Diretrizes de design UI/UX
```

---

## 3. FLUXO DE AUTENTICAÇÃO

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │      │ Frontend │      │ Backend  │      │ MongoDB  │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │  1. Login       │                 │                 │
     │────────────────▶│                 │                 │
     │                 │                 │                 │
     │                 │ 2. POST /api/auth/login           │
     │                 │────────────────▶│                 │
     │                 │                 │                 │
     │                 │                 │ 3. Find user    │
     │                 │                 │────────────────▶│
     │                 │                 │                 │
     │                 │                 │ 4. User data    │
     │                 │                 │◀────────────────│
     │                 │                 │                 │
     │                 │                 │ 5. Verify password
     │                 │                 │    Generate JWT │
     │                 │                 │                 │
     │                 │ 6. { token, user }                │
     │                 │◀────────────────│                 │
     │                 │                 │                 │
     │                 │ 7. Store in localStorage          │
     │                 │    Set axios header               │
     │                 │                 │                 │
     │  8. Redirect to │                 │                 │
     │     Dashboard   │                 │                 │
     │◀────────────────│                 │                 │
     │                 │                 │                 │
```

---

## 4. FLUXO DE DADOS - CRM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO CRM - LEAD TO CLIENT                          │
└─────────────────────────────────────────────────────────────────────────────┘

 LEAD                                                                   CLIENT
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  NOVO   │──▶│ CONTATO │──▶│ REUNIÃO │──▶│PROPOSTA │──▶│ FECHADO │──▶│ CLIENTE │
│  LEAD   │   │  FEITO  │   │         │   │         │   │         │   │  ATIVO  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
     │                                                        │              │
     │                                          ┌─────────────┘              │
     │                                          │                            │
     │                                          ▼                            │
     │                                    ┌───────────┐                      │
     │                                    │  PERDIDO  │                      │
     │                                    └───────────┘                      │
     │                                                                       │
     │                        CONVERSÃO                                      │
     │  ┌────────────────────────────────────────────────────────────────┐   │
     │  │  1. Cria documento client com dados do lead                   │   │
     │  │  2. Gera checklist de onboarding (12 itens)                   │   │
     │  │  3. Cria tarefas recorrentes na agenda                        │   │
     │  │  4. Marca lead como "fechado"                                 │   │
     │  └────────────────────────────────────────────────────────────────┘   │
     │                                                                       │
     └───────────────────────────────────────────────────────────────────────┘
```

---

## 5. MODELO DE DADOS (MongoDB)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA MODELS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ users ─────────────────────────┐
│ id: string (UUID)               │
│ name: string                    │
│ email: string (unique)          │
│ password: string (bcrypt)       │
│ role: "USER"|"ADMIN"|"SUPER_ADMIN"
│ status: "active"|"paused"|"blocked"
│ plan: "free"|"starter"|"pro"|"enterprise"
│ plan_value: number              │
│ plan_status: "active"|"overdue"|"canceled"
│ plan_expires_at: datetime?      │
│ settings: {                     │
│   monthly_goal: number          │
│   leads_alert_days: number      │
│ }                               │
│ last_login_at: datetime?        │
│ created_at: datetime            │
│ updated_at: datetime            │
└─────────────────────────────────┘
           │
           │ 1:N
           ▼
┌─ leads ─────────────────────────┐     ┌─ clients ───────────────────────┐
│ id: string (UUID)               │     │ id: string (UUID)               │
│ name: string                    │────▶│ name: string                    │
│ email: string?                  │     │ email: string?                  │
│ phone: string?                  │     │ phone: string?                  │
│ company: string?                │     │ company: string?                │
│ stage: string (6 valores)       │     │ contract_value: number          │
│ contract_value: number          │     │ plan: "unico"|"recorrente"      │
│ next_contact: date?             │     │ notes: string?                  │
│ reminder: string?               │     │ checklist: [                    │
│ notes: string?                  │     │   { id, title, completed }      │
│ user_id: string (FK)            │     │ ]                               │
│ created_at: datetime            │     │ weekly_tasks: [                 │
│ updated_at: datetime            │     │   { id, title, completed }      │
└─────────────────────────────────┘     │ ]                               │
                                        │ weekly_tasks_reset_at: datetime │
                                        │ user_id: string (FK)            │
                                        │ created_at: datetime            │
                                        │ updated_at: datetime            │
                                        └─────────────────────────────────┘
                                                      │
                                                      │ 1:N
                                        ┌─────────────┴─────────────┐
                                        ▼                           ▼
              ┌─ tasks ─────────────────────────┐    ┌─ payments ─────────────────────┐
              │ id: string (UUID)               │    │ id: string (UUID)               │
              │ title: string                   │    │ client_id: string (FK)          │
              │ description: string?            │    │ client_name: string             │
              │ task_type: string (4 valores)   │    │ description: string             │
              │ due_date: date                  │    │ amount: number                  │
              │ completed: boolean              │    │ payment_type: "pontual"|"recorrente"
              │ client_id: string? (FK)         │    │ due_date: date                  │
              │ client_name: string?            │    │ paid: boolean                   │
              │ lead_id: string? (FK)           │    │ user_id: string (FK)            │
              │ lead_name: string?              │    │ created_at: datetime            │
              │ user_id: string (FK)            │    └─────────────────────────────────┘
              │ created_at: datetime            │
              └─────────────────────────────────┘

┌─ audit_logs ────────────────────┐
│ id: string (UUID)               │
│ actor_id: string                │
│ actor_email: string             │
│ action: string                  │
│ target_id: string               │
│ target_email: string            │
│ details: object                 │
│ created_at: datetime            │
└─────────────────────────────────┘
```

---

## 6. API ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API ROUTES                                      │
└─────────────────────────────────────────────────────────────────────────────┘

AUTH
├── POST   /api/auth/register      # Criar conta
├── POST   /api/auth/login         # Login
└── GET    /api/auth/me            # Dados do usuário logado

LEADS
├── GET    /api/leads              # Listar leads
├── POST   /api/leads              # Criar lead
├── PUT    /api/leads/{id}         # Atualizar lead
├── DELETE /api/leads/{id}         # Excluir lead
└── POST   /api/leads/{id}/convert # Converter em cliente

CLIENTS
├── GET    /api/clients            # Listar clientes
├── GET    /api/clients/{id}       # Detalhes do cliente
├── POST   /api/clients            # Criar cliente
├── PUT    /api/clients/{id}       # Atualizar cliente
├── DELETE /api/clients/{id}       # Excluir cliente
├── PUT    /api/clients/{id}/checklist/{item_id}  # Toggle checklist
│
│   WEEKLY TASKS
├── GET    /api/clients/{id}/weekly-tasks         # Listar tarefas da semana
├── POST   /api/clients/{id}/weekly-tasks         # Criar tarefa da semana
├── PUT    /api/clients/{id}/weekly-tasks/{tid}   # Atualizar tarefa
└── DELETE /api/clients/{id}/weekly-tasks/{tid}   # Excluir tarefa

TASKS
├── GET    /api/tasks              # Listar tarefas (com filtros)
├── POST   /api/tasks              # Criar tarefa
├── PUT    /api/tasks/{id}         # Atualizar tarefa
└── DELETE /api/tasks/{id}         # Excluir tarefa

PAYMENTS
├── GET    /api/payments           # Listar pagamentos
├── POST   /api/payments           # Criar pagamento
├── PUT    /api/payments/{id}      # Atualizar pagamento
└── DELETE /api/payments/{id}      # Excluir pagamento

DASHBOARD
└── GET    /api/dashboard/stats    # Estatísticas do dashboard

USER SETTINGS
└── PUT    /api/user/settings      # Atualizar configurações

ADMIN (SUPER_ADMIN only)
├── GET    /api/admin/check        # Verificar permissões
├── GET    /api/admin/stats        # Estatísticas globais
├── GET    /api/admin/events       # Eventos recentes
├── GET    /api/admin/users        # Listar usuários
├── GET    /api/admin/users/{id}   # Detalhes do usuário
├── POST   /api/admin/users        # Criar usuário
├── PUT    /api/admin/users/{id}/status   # Bloquear/desbloquear
├── PUT    /api/admin/users/{id}/role     # Alterar role
├── PUT    /api/admin/users/{id}/plan     # Alterar plano
├── PUT    /api/admin/users/{id}/profile  # Editar perfil
├── PUT    /api/admin/users/{id}/password # Reset senha
├── DELETE /api/admin/users/{id}          # Excluir usuário
├── POST   /api/admin/impersonate/{id}    # Impersonar usuário
├── POST   /api/admin/exit-impersonate    # Sair da impersonação
└── GET    /api/admin/audit-logs          # Logs de auditoria
```

---

## 7. FLUXO DE NAVEGAÇÃO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NAVIGATION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    LOGIN     │
                              │   /login     │
                              └──────┬───────┘
                                     │
                                     │ auth success
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN LAYOUT                                     │
│  ┌─────────────────┐                                                        │
│  │    SIDEBAR      │                                                        │
│  │                 │        ┌───────────────────────────────────────────┐   │
│  │  □ Dashboard ───┼───────▶│            DASHBOARD (/)                  │   │
│  │  □ CRM ─────────┼───────▶│               CRM (/crm)                  │   │
│  │  □ Clientes ────┼───────▶│           CLIENTS (/clients)              │   │
│  │  □ Agenda ──────┼───────▶│            AGENDA (/agenda)               │   │
│  │  □ Financeiro ──┼───────▶│           FINANCE (/finance)              │   │
│  │                 │        └───────────────────────────────────────────┘   │
│  │  ─────────────  │                                                        │
│  │  Admin          │                                                        │
│  │  □ Admin Master─┼───────▶ ADMIN ROUTES (below)                          │
│  │                 │                                                        │
│  │  [User Info]    │                                                        │
│  │  [Logout]       │                                                        │
│  └─────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

                              CLIENT DETAIL
                    ┌─────────────────────────────────────┐
                    │        /clients/:id                 │
  /clients ────────▶│                                     │
                    │  - Info do cliente                  │
                    │  - Checklist de onboarding          │
                    │  - Tarefas da semana               │
                    │  - Tarefas na agenda               │
                    └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            ADMIN LAYOUT                                      │
│  ┌─────────────────┐                                                        │
│  │  ADMIN SIDEBAR  │                                                        │
│  │                 │        ┌───────────────────────────────────────────┐   │
│  │  □ Dashboard ───┼───────▶│       ADMIN DASHBOARD (/admin)            │   │
│  │  □ Usuários ────┼───────▶│       ADMIN USERS (/admin/users)          │   │
│  │  □ Auditoria ───┼───────▶│       ADMIN AUDIT (/admin/audit)          │   │
│  │                 │        └───────────────────────────────────────────┘   │
│  │  [Exit Admin]   │                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
│                    /admin/users/:id ─────▶ USER DETAIL                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. COMPONENTES UI (Shadcn)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          UI COMPONENTS                                       │
└─────────────────────────────────────────────────────────────────────────────┘

LAYOUT
├── Card, CardHeader, CardContent, CardTitle
├── Tabs, TabsList, TabsTrigger, TabsContent
├── Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
├── Sheet (mobile drawer)
├── Separator

FORM
├── Button
├── Input
├── Textarea
├── Label
├── Checkbox
├── Select, SelectTrigger, SelectContent, SelectItem
├── RadioGroup

DATA DISPLAY
├── Table, TableHeader, TableBody, TableRow, TableCell
├── Badge
├── Progress
├── Avatar

FEEDBACK
├── Toast (Sonner)
├── Alert, AlertDialog
├── Tooltip

NAVIGATION
├── DropdownMenu
├── Popover
├── NavigationMenu
├── Breadcrumb
```

---

## 9. SEGURANÇA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

AUTENTICAÇÃO
├── JWT Token (24h expiration)
├── bcrypt password hashing
└── Token stored in localStorage

AUTORIZAÇÃO
├── Role-based access control (RBAC)
│   ├── USER - Acesso básico
│   ├── ADMIN - Acesso estendido
│   └── SUPER_ADMIN - Acesso total + Admin Panel
│
├── Route Protection
│   ├── ProtectedRoute - Requer autenticação
│   ├── PublicRoute - Redireciona se autenticado
│   └── AdminRoute - Requer SUPER_ADMIN
│
└── API Protection
    ├── HTTPBearer - Header Authorization
    ├── get_current_user - Valida token + status
    ├── get_super_admin - Requer SUPER_ADMIN
    └── get_admin_or_super - Requer ADMIN+

CORS
└── Configurado via CORS_ORIGINS env var

AUDIT
└── Logs de todas ações administrativas
```

---

## 10. AMBIENTE DE EXECUÇÃO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RUNTIME ENVIRONMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           KUBERNETES POD                                     │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   NGINX     │  │  FRONTEND   │  │  BACKEND    │  │  MONGODB    │        │
│  │   Proxy     │  │   React     │  │  FastAPI    │  │  Database   │        │
│  │             │  │             │  │             │  │             │        │
│  │  Port: 80   │  │  Port: 3000 │  │  Port: 8001 │  │ Port: 27017 │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │                │
│         │   /api/*       │                │                │                │
│         │───────────────────────────────▶│                │                │
│         │                │                │                │                │
│         │   /*           │                │                │                │
│         │───────────────▶│                │                │                │
│         │                │                │                │                │
│                                                                              │
│  Supervisor manages: frontend, backend, mongodb, nginx                      │
└─────────────────────────────────────────────────────────────────────────────┘

ENVIRONMENT VARIABLES
├── Backend (.env)
│   ├── MONGO_URL=mongodb://localhost:27017
│   ├── DB_NAME=test_database
│   └── CORS_ORIGINS=*
│
└── Frontend (.env)
    ├── REACT_APP_BACKEND_URL=https://rankflow-build.preview.emergentagent.com
    └── WDS_SOCKET_PORT=443
```

---

*Arquitetura documentada em 05/03/2026*
