import { useState, useEffect } from "react";
import api from "../lib/api";
import { formatDate, TASK_TYPES, isPast, isToday } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Plus, Calendar, Clock, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

export default function AgendaPage() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "outro",
    due_date: new Date().toISOString().split("T")[0],
    client_id: "none",
    lead_id: "none",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, clientsRes, leadsRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/clients"),
        api.get("/leads"),
      ]);
      setTasks(tasksRes.data);
      setClients(clientsRes.data);
      setLeads(leadsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        client_id: formData.client_id === "none" ? null : formData.client_id,
        lead_id: formData.lead_id === "none" ? null : formData.lead_id,
      };
      await api.post("/tasks", payload);
      toast.success("Tarefa criada com sucesso!");
      fetchData();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar tarefa");
    }
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { completed: !currentStatus });
      fetchData();
      toast.success(currentStatus ? "Tarefa reaberta" : "Tarefa concluída!");
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success("Tarefa excluída!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir tarefa");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      title: "",
      description: "",
      task_type: "outro",
      due_date: new Date().toISOString().split("T")[0],
      client_id: "none",
      lead_id: "none",
    });
  };

  const filterTasks = (filter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    return tasks.filter((task) => {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      switch (filter) {
        case "today":
          return !task.completed && dueDate <= today;
        case "week":
          return !task.completed && dueDate <= weekEnd;
        case "followups":
          return !task.completed && task.task_type === "follow_up";
        case "all":
          return !task.completed;
        default:
          return true;
      }
    });
  };

  const getOverdueTasks = () => {
    return tasks.filter((task) => !task.completed && isPast(task.due_date) && !isToday(task.due_date));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const overdueTasks = getOverdueTasks();

  return (
    <div className="p-6 md:p-8" data-testid="agenda-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Agenda</h1>
          <p className="text-slate-500 mt-1">Gerencie suas tarefas e follow-ups</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2" data-testid="add-task-btn">
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="overdue-alert">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              Você tem {overdueTasks.length} tarefa(s) atrasada(s)
            </span>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="today" className="gap-2" data-testid="tab-today">
            <Calendar className="w-4 h-4" />
            Hoje
            <Badge variant="secondary" className="ml-1">{filterTasks("today").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-2" data-testid="tab-week">
            <Clock className="w-4 h-4" />
            Semana
            <Badge variant="secondary" className="ml-1">{filterTasks("week").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-2" data-testid="tab-followups">
            Follow-ups
            <Badge variant="secondary" className="ml-1">{filterTasks("followups").length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2" data-testid="tab-all">
            Todas
            <Badge variant="secondary" className="ml-1">{filterTasks("all").length}</Badge>
          </TabsTrigger>
        </TabsList>

        {["today", "week", "followups", "all"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-6">
                {filterTasks(tab).length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">Nenhuma tarefa pendente</p>
                    <p className="text-sm mt-1">
                      {tab === "today" && "Você está em dia!"}
                      {tab === "week" && "Sem tarefas para esta semana"}
                      {tab === "followups" && "Nenhum follow-up pendente"}
                      {tab === "all" && "Crie uma nova tarefa para começar"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterTasks(tab).map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggleComplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* New Task Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" data-testid="task-modal">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="task-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                data-testid="task-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.task_type}
                  onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                >
                  <SelectTrigger data-testid="task-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  data-testid="task-due-date-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Select
                  value={formData.client_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value, lead_id: "" })}
                >
                  <SelectTrigger data-testid="task-client-select">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lead (opcional)</Label>
                <Select
                  value={formData.lead_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, lead_id: value === "none" ? "" : value, client_id: "" })}
                >
                  <SelectTrigger data-testid="task-lead-select">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="task-submit-btn">
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  const isOverdue = isPast(task.due_date) && !isToday(task.due_date);

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 group ${
        isOverdue
          ? "bg-red-50 border-red-200"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
      data-testid={`task-item-${task.id}`}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id, task.completed)}
        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-700 truncate">{task.title}</p>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Atrasada
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
          {task.client_name && <span>Cliente: {task.client_name}</span>}
          {task.lead_name && <span>Lead: {task.lead_name}</span>}
        </div>
      </div>

      <Badge className={`task-${task.task_type} shrink-0`}>
        {TASK_TYPES[task.task_type]?.label || task.task_type}
      </Badge>

      <div className={`text-sm font-mono shrink-0 ${isOverdue ? "text-red-600" : "text-slate-400"}`}>
        {formatDate(task.due_date)}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => onDelete(task.id)}
        data-testid={`delete-task-${task.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
