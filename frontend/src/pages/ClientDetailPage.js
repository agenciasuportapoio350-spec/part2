import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate, TASK_TYPES } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CurrencyInput } from "../components/CurrencyInput";
import { toast } from "sonner";
import { 
  ArrowLeft, Building, Phone, Mail, DollarSign, Calendar, CheckCircle2, Circle, 
  Loader2, Edit, Plus, Trash2, RefreshCw, User, MessageCircle, ListTodo, CreditCard, ExternalLink 
} from "lucide-react";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [newWeeklyTask, setNewWeeklyTask] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [chargeForm, setChargeForm] = useState({
    amount: 0,
    description: "",
    due_date: new Date().toISOString().split("T")[0],
  });
  const [creatingCharge, setCreatingCharge] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contract_value: 0,
    plan: "recorrente",
    notes: "",
  });

  useEffect(() => {
    fetchClient();
    fetchTasks();
    fetchWeeklyTasks();
    fetchCharges();
    
    // Verificar se retornou do pagamento
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    
    if (payment === "success" && sessionId) {
      pollPaymentStatus(sessionId);
    } else if (payment === "cancelled") {
      toast.info("Pagamento cancelado");
    }
  }, [id, searchParams]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      setClient(response.data);
      setEditForm({
        name: response.data.name || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        company: response.data.company || "",
        contract_value: response.data.contract_value || 0,
        plan: response.data.plan || "recorrente",
        notes: response.data.notes || "",
      });
    } catch (error) {
      toast.error("Erro ao carregar cliente");
      navigate("/clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await api.get("/tasks");
      const clientTasks = response.data.filter((t) => t.client_id === id);
      setTasks(clientTasks);
    } catch (error) {
      console.error("Erro ao carregar tarefas", error);
    }
  };

  const fetchWeeklyTasks = async () => {
    try {
      const response = await api.get(`/clients/${id}/weekly-tasks`);
      setWeeklyTasks(response.data.weekly_tasks || []);
    } catch (error) {
      console.error("Erro ao carregar tarefas da semana", error);
    }
  };

  const fetchCharges = async () => {
    try {
      const response = await api.get(`/charges/client/${id}`);
      setCharges(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar cobranças", error);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.info("Verifique o email para confirmação do pagamento");
      return;
    }

    try {
      const response = await api.get(`/charges/status/${sessionId}`);
      
      if (response.data.payment_status === "paid") {
        toast.success("Pagamento confirmado!");
        fetchCharges();
        return;
      } else if (response.data.status === "cancelado") {
        toast.error("Sessão de pagamento expirada");
        fetchCharges();
        return;
      }

      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error("Erro ao verificar status:", error);
    }
  };

  const handleCreateCharge = async (e) => {
    e.preventDefault();
    if (!chargeForm.amount || chargeForm.amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!chargeForm.description.trim()) {
      toast.error("Informe uma descrição");
      return;
    }

    setCreatingCharge(true);
    try {
      const response = await api.post("/charges/create", {
        client_id: id,
        amount: parseFloat(chargeForm.amount),
        description: chargeForm.description,
        due_date: chargeForm.due_date,
      });
      
      toast.success("Cobrança criada com sucesso!");
      fetchCharges();
      setChargeModalOpen(false);
      setChargeForm({ amount: 0, description: "", due_date: new Date().toISOString().split("T")[0] });
      
      // Abrir link de pagamento em nova aba
      if (response.data.payment_link) {
        window.open(response.data.payment_link, "_blank");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar cobrança");
    } finally {
      setCreatingCharge(false);
    }
  };

  const getChargeStatusBadge = (status) => {
    const styles = {
      pendente: "bg-amber-100 text-amber-800 border-amber-200",
      pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cancelado: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
    return (
      <Badge variant="outline" className={styles[status] || styles.pendente}>
        {labels[status] || status}
      </Badge>
    );
  };

  const toggleChecklistItem = async (itemId) => {
    try {
      await api.put(`/clients/${id}/checklist/${itemId}`);
      fetchClient();
      toast.success("Item atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const toggleTaskComplete = async (taskId, currentStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { completed: !currentStatus });
      fetchTasks();
      toast.success(currentStatus ? "Tarefa reaberta" : "Tarefa concluída!");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  // Edit Client
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/clients/${id}`, editForm);
      toast.success("Cliente atualizado com sucesso!");
      fetchClient();
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar cliente");
    }
  };

  // Weekly Tasks Functions
  const addWeeklyTask = async () => {
    if (!newWeeklyTask.trim()) return;
    try {
      await api.post(`/clients/${id}/weekly-tasks?title=${encodeURIComponent(newWeeklyTask)}`);
      setNewWeeklyTask("");
      fetchWeeklyTasks();
      toast.success("Tarefa adicionada!");
    } catch (error) {
      toast.error("Erro ao adicionar tarefa");
    }
  };

  const toggleWeeklyTask = async (taskId, completed) => {
    try {
      await api.put(`/clients/${id}/weekly-tasks/${taskId}?completed=${!completed}`);
      fetchWeeklyTasks();
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const deleteWeeklyTask = async (taskId) => {
    try {
      await api.delete(`/clients/${id}/weekly-tasks/${taskId}`);
      fetchWeeklyTasks();
      toast.success("Tarefa excluída!");
    } catch (error) {
      toast.error("Erro ao excluir tarefa");
    }
  };

  const startEditWeeklyTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveEditWeeklyTask = async () => {
    if (!editingTaskTitle.trim()) return;
    try {
      await api.put(`/clients/${id}/weekly-tasks/${editingTaskId}?title=${encodeURIComponent(editingTaskTitle)}`);
      setEditingTaskId(null);
      setEditingTaskTitle("");
      fetchWeeklyTasks();
      toast.success("Tarefa atualizada!");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const getPlanBadge = (plan) => {
    if (plan === "unico") {
      return <Badge variant="outline" className="border-slate-300 text-slate-600"><User className="w-3 h-3 mr-1" />Cliente Único</Badge>;
    }
    return <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50"><RefreshCw className="w-3 h-3 mr-1" />Cliente Recorrente</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) return null;

  const checklistCompleted = client.checklist?.filter((i) => i.completed).length || 0;
  const checklistTotal = client.checklist?.length || 0;
  const checklistProgress = checklistTotal ? (checklistCompleted / checklistTotal) * 100 : 0;

  const weeklyTasksCompleted = weeklyTasks.filter((t) => t.completed).length;
  const weeklyTasksTotal = weeklyTasks.length;

  return (
    <div className="p-6 md:p-8" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/clients")}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {client.company && (
                <span className="text-slate-500 flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {client.company}
                </span>
              )}
              {getPlanBadge(client.plan)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.phone && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => {
                const phone = client.phone.replace(/\D/g, '');
                window.open(`https://wa.me/55${phone}`, '_blank');
              }}
              data-testid="whatsapp-btn"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            data-testid="edit-client-btn"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Informações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1️⃣ Client Info */}
        <Card className="lg:col-span-1" data-testid="client-info-card">
          <CardHeader>
            <CardTitle className="text-lg">Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{client.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 font-mono font-semibold">
                {formatCurrency(client.contract_value)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Cliente desde {formatDate(client.created_at)}</span>
            </div>
            {client.notes && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Notas</p>
                <p className="text-sm text-slate-600">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2️⃣ Checklist de Onboarding */}
        <Card className="lg:col-span-2" data-testid="checklist-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Checklist de Onboarding</CardTitle>
              <Badge variant={checklistProgress === 100 ? "default" : "secondary"} className="font-mono">
                {checklistCompleted}/{checklistTotal}
              </Badge>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {client.checklist?.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    item.completed
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => toggleChecklistItem(item.id)}
                  data-testid={`checklist-item-${item.id}`}
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <span className={`flex-1 ${item.completed ? "text-emerald-700 line-through" : "text-slate-700"}`}>
                    {item.title}
                  </span>
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3️⃣ Tarefas da Semana (Otimização) */}
        <Card className="lg:col-span-3" data-testid="weekly-tasks-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">Tarefas da Semana</CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono">
                {weeklyTasksCompleted}/{weeklyTasksTotal}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Tarefas de otimização semanal do cliente (resetam toda segunda-feira)
            </p>
          </CardHeader>
          <CardContent>
            {/* Add new task */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Nova tarefa da semana..."
                value={newWeeklyTask}
                onChange={(e) => setNewWeeklyTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWeeklyTask()}
                data-testid="new-weekly-task-input"
              />
              <Button onClick={addWeeklyTask} data-testid="add-weekly-task-btn">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Tasks list */}
            {weeklyTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma tarefa da semana</p>
                <p className="text-sm">Adicione tarefas de otimização para este cliente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {weeklyTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      task.completed
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                    data-testid={`weekly-task-${task.id}`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleWeeklyTask(task.id, task.completed)}
                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                    
                    {editingTaskId === task.id ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEditWeeklyTask()}
                          autoFocus
                          className="flex-1"
                        />
                        <Button size="sm" onClick={saveEditWeeklyTask}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <>
                        <span className={`flex-1 ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-600"
                            onClick={() => startEditWeeklyTask(task)}
                            data-testid={`edit-weekly-task-${task.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={() => deleteWeeklyTask(task.id)}
                            data-testid={`delete-weekly-task-${task.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas na Agenda (mantido para compatibilidade) */}
        {tasks.length > 0 && (
          <Card className="lg:col-span-3" data-testid="tasks-card">
            <CardHeader>
              <CardTitle className="text-lg">Tarefas na Agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
                      task.completed
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                    data-testid={`task-item-${task.id}`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTaskComplete(task.id, task.completed)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <Badge className={`task-${task.task_type}`}>
                      {TASK_TYPES[task.task_type]?.label || task.task_type}
                    </Badge>
                    <div className="text-sm text-slate-400 font-mono">
                      {formatDate(task.due_date)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5️⃣ Cobranças Stripe */}
        <Card className="lg:col-span-3" data-testid="charges-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Cobranças
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => setChargeModalOpen(true)}
                data-testid="create-charge-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Cobrança
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {charges.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhuma cobrança criada</p>
                <p className="text-sm mt-1">Crie uma cobrança para gerar link de pagamento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {charges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white"
                    data-testid={`charge-item-${charge.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">{charge.description}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Vencimento: {formatDate(charge.due_date)}
                      </p>
                    </div>
                    <div className="text-lg font-mono font-semibold text-slate-700">
                      {formatCurrency(charge.amount)}
                    </div>
                    {getChargeStatusBadge(charge.status)}
                    {charge.payment_link && charge.status === "pendente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(charge.payment_link, "_blank")}
                        data-testid={`open-payment-link-${charge.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Link
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg" data-testid="edit-client-modal">
          <DialogHeader>
            <DialogTitle>Editar Informações do Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  data-testid="edit-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  data-testid="edit-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  data-testid="edit-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  data-testid="edit-company-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Plano do Cliente *</Label>
                <Select
                  value={editForm.plan}
                  onValueChange={(value) => setEditForm({ ...editForm, plan: value })}
                >
                  <SelectTrigger data-testid="edit-plan-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorrente">Cliente Recorrente</SelectItem>
                    <SelectItem value="unico">Cliente Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  data-testid="edit-notes-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="save-edit-btn">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Charge Modal */}
      <Dialog open={chargeModalOpen} onOpenChange={setChargeModalOpen}>
        <DialogContent className="max-w-md" data-testid="create-charge-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Criar Cobrança
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCharge} className="space-y-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <CurrencyInput
                value={chargeForm.amount}
                onChange={(value) => setChargeForm({ ...chargeForm, amount: value })}
                data-testid="charge-amount-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                placeholder="Ex: Mensalidade Março/2026"
                data-testid="charge-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={chargeForm.due_date}
                onChange={(e) => setChargeForm({ ...chargeForm, due_date: e.target.value })}
                data-testid="charge-due-date-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChargeModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingCharge} data-testid="submit-charge-btn">
                {creatingCharge ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Criar e Abrir Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
