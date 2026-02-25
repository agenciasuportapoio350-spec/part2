import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate, TASK_TYPES, maskCurrency, parseCurrencyInput, formatCurrencyInput, getTodayDateString } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { toast } from "sonner";
import { ArrowLeft, Building, Phone, Mail, DollarSign, Calendar, CheckCircle2, Circle, Loader2, Pencil, Plus, RefreshCw, User } from "lucide-react";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, taskId: null, itemId: null });
  
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contract_value: "",
    plan: "unico",
  });
  
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    task_type: "outro",
    due_date: getTodayDateString(),
  });

  useEffect(() => {
    fetchClient();
    fetchTasks();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/clients/${id}`);
      setClient(response.data);
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

  const openEditModal = () => {
    setEditFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      contract_value: formatCurrencyInput(client.contract_value),
      plan: client.plan || "unico",
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...editFormData,
        contract_value: parseCurrencyInput(editFormData.contract_value),
      };
      await api.put(`/clients/${id}`, dataToSend);
      toast.success("Cliente atualizado com sucesso!");
      fetchClient();
      setEditModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar cliente");
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...taskFormData,
        client_id: id,
      };
      await api.post("/tasks", payload);
      toast.success("Tarefa criada com sucesso!");
      fetchTasks();
      setTaskModalOpen(false);
      setTaskFormData({
        title: "",
        description: "",
        task_type: "outro",
        due_date: getTodayDateString(),
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar tarefa");
    }
  };

  const toggleChecklistItem = async (itemId) => {
    const item = client.checklist?.find(i => i.id === itemId);
    // Se vai marcar como concluído, pedir confirmação
    if (item && !item.completed) {
      setConfirmDialog({ open: true, type: "checklist", itemId });
      return;
    }
    // Se vai desmarcar, fazer direto
    try {
      await api.put(`/clients/${id}/checklist/${itemId}`);
      fetchClient();
      toast.success("Item atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const toggleTaskComplete = async (taskId, currentStatus) => {
    // Se vai concluir, pedir confirmação
    if (!currentStatus) {
      setConfirmDialog({ open: true, type: "task", taskId });
      return;
    }
    // Se vai reabrir, fazer direto
    try {
      await api.put(`/tasks/${taskId}`, { completed: false });
      fetchTasks();
      toast.success("Tarefa reaberta!");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmDialog.type === "checklist") {
        await api.put(`/clients/${id}/checklist/${confirmDialog.itemId}`);
        fetchClient();
        toast.success("Item concluído!");
      } else if (confirmDialog.type === "task") {
        await api.put(`/tasks/${confirmDialog.taskId}`, { completed: true });
        fetchTasks();
        toast.success("Tarefa concluída!");
      }
    } catch (error) {
      toast.error("Erro ao executar ação");
    }
    setConfirmDialog({ open: false, type: null, taskId: null, itemId: null });
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
  const isRecorrente = client.plan === "recorrente";

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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
              <Badge className={isRecorrente ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                {isRecorrente ? (
                  <><RefreshCw className="w-3 h-3 mr-1" /> Recorrente</>
                ) : (
                  <><User className="w-3 h-3 mr-1" /> Único</>
                )}
              </Badge>
            </div>
            {client.company && (
              <p className="text-slate-500 flex items-center gap-2 mt-1">
                <Building className="w-4 h-4" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEditModal} className="gap-2">
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
          <Button onClick={() => setTaskModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card className="lg:col-span-1" data-testid="client-info-card">
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
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

        {/* Checklist */}
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
                className={`h-full rounded-full transition-all duration-300 ${isRecorrente ? "bg-emerald-500" : "bg-blue-500"}`}
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
                      ? isRecorrente ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => toggleChecklistItem(item.id)}
                  data-testid={`checklist-item-${item.id}`}
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                    className={`data-[state=checked]:border-${isRecorrente ? "emerald" : "blue"}-500 data-[state=checked]:bg-${isRecorrente ? "emerald" : "blue"}-500`}
                  />
                  <span className={`flex-1 ${item.completed ? `${isRecorrente ? "text-emerald-700" : "text-blue-700"} line-through` : "text-slate-700"}`}>
                    {item.title}
                  </span>
                  {item.completed ? (
                    <CheckCircle2 className={`w-5 h-5 ${isRecorrente ? "text-emerald-500" : "text-blue-500"}`} />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="lg:col-span-3" data-testid="tasks-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tarefas do Cliente</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setTaskModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Tarefa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma tarefa encontrada para este cliente</p>
                <Button size="sm" variant="link" onClick={() => setTaskModalOpen(true)} className="mt-2">
                  Criar primeira tarefa
                </Button>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Editar Cliente */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={editFormData.company}
                  onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor do Contrato (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={editFormData.contract_value}
                  onChange={(e) => setEditFormData({ ...editFormData, contract_value: maskCurrency(e.target.value) })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Plano</Label>
                <Select
                  value={editFormData.plan}
                  onValueChange={(value) => setEditFormData({ ...editFormData, plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unico">Único</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Tarefa */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Tarefa para {client.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                placeholder="Ex: Revisar perfil do Google"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                placeholder="Detalhes da tarefa..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={taskFormData.task_type}
                  onValueChange={(value) => setTaskFormData({ ...taskFormData, task_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title="Tem certeza?"
        description={
          confirmDialog.type === "checklist"
            ? "O item do checklist será marcado como concluído."
            : "A tarefa será marcada como concluída."
        }
        onConfirm={handleConfirmAction}
        variant="default"
        confirmText="Concluir"
      />
    </div>
  );
}
