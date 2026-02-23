import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate, TASK_TYPES } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Building, Phone, Mail, DollarSign, Calendar, CheckCircle2, Circle, Loader2 } from "lucide-react";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 md:p-8" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
          {client.company && (
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Building className="w-4 h-4" />
              {client.company}
            </p>
          )}
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

        {/* Tasks */}
        <Card className="lg:col-span-3" data-testid="tasks-card">
          <CardHeader>
            <CardTitle className="text-lg">Tarefas do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Nenhuma tarefa encontrada para este cliente
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
    </div>
  );
}
