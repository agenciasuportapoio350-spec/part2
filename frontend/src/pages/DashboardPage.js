import { useState, useEffect } from "react";
import api from "../lib/api";
import { formatCurrency } from "../lib/utils";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Target,
  AlertTriangle,
  AlertCircle,
  Info,
  Settings,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [alertDaysInput, setAlertDaysInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setStats(response.data);
      setGoalInput(response.data.settings?.monthly_goal || "");
      setAlertDaysInput(response.data.settings?.leads_alert_days || 7);
    } catch (error) {
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put("/user/settings", {
        monthly_goal: parseFloat(goalInput) || 0,
        leads_alert_days: parseInt(alertDaysInput) || 7
      });
      toast.success("Configurações salvas");
      setSettingsOpen(false);
      fetchStats();
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case "error":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-amber-200 bg-amber-50";
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const goalPercentage = stats?.goal_percentage || 0;
  const monthlyGoal = stats?.monthly_goal || 0;

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do seu negócio</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSettingsOpen(true)}
          className="gap-2"
          data-testid="settings-btn"
        >
          <Settings className="w-4 h-4" />
          Configurar Meta
        </Button>
      </div>

      {/* Meta do Mês */}
      <Card className="border-slate-200 shadow-sm" data-testid="goal-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Meta do Mês</p>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {formatCurrency(stats?.monthly_revenue || 0)}
                  <span className="text-base font-normal text-slate-400"> / {formatCurrency(monthlyGoal)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-emerald-600 font-mono">{goalPercentage.toFixed(0)}%</p>
              <p className="text-xs text-slate-400">concluído</p>
            </div>
          </div>
          <Progress value={goalPercentage} className="h-3" />
          {monthlyGoal === 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Configure sua meta mensal clicando em "Configurar Meta"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="space-y-3" data-testid="alerts-section">
          {stats.alerts.map((alert, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-3 p-4 rounded-lg border ${getAlertStyle(alert.type)}`}
              data-testid={`alert-${index}`}
            >
              {getAlertIcon(alert.type)}
              <div>
                <p className="font-medium text-slate-900">{alert.title}</p>
                <p className="text-sm text-slate-600">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm" data-testid="stat-leads">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Leads no Pipeline</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 font-mono">
                  {stats?.leads_total || 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="stat-clients">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Clientes Ativos</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 font-mono">
                  {stats?.clients_count || 0}
                </p>
                {stats?.clients_closed_this_month > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    +{stats.clients_closed_this_month} este mês
                  </p>
                )}
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="stat-tasks">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Tarefas Hoje</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 font-mono">
                  {stats?.tasks_today || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {stats?.tasks_pending || 0} pendentes
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="stat-revenue">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Receita Pendente</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 font-mono">
                  {formatCurrency(stats?.pending_revenue || 0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">a receber</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas do Dia */}
        <Card className="border-slate-200 shadow-sm" data-testid="tasks-today-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Tarefas do Dia
            </h3>
            {stats?.tasks_today_list && stats.tasks_today_list.length > 0 ? (
              <div className="space-y-3">
                {stats.tasks_today_list.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {task.type === "onboarding" ? "Onboarding" : 
                         task.type === "recorrente" ? "Recorrente" : 
                         task.type === "follow_up" ? "Follow-up" : "Outro"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma tarefa para hoje</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Overview */}
        <Card className="border-slate-200 shadow-sm" data-testid="pipeline-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Pipeline de Vendas
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "novo_lead", label: "Novo", color: "bg-blue-50 text-blue-600" },
                { key: "contato_feito", label: "Contato", color: "bg-cyan-50 text-cyan-600" },
                { key: "reuniao", label: "Reunião", color: "bg-amber-50 text-amber-600" },
                { key: "proposta", label: "Proposta", color: "bg-violet-50 text-violet-600" },
                { key: "fechado", label: "Fechado", color: "bg-emerald-50 text-emerald-600" },
                { key: "perdido", label: "Perdido", color: "bg-red-50 text-red-600" },
              ].map(({ key, label, color }) => (
                <div key={key} className={`text-center p-3 rounded-lg ${color.split(" ")[0]}`}>
                  <p className={`text-2xl font-bold font-mono ${color.split(" ")[1]}`}>
                    {stats?.leads_by_stage?.[key] || 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Valor do Pipeline</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(stats?.total_pipeline_value || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações do Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Meta Mensal (R$)
              </label>
              <Input
                type="number"
                placeholder="Ex: 10000"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                data-testid="goal-input"
              />
              <p className="text-xs text-slate-400">
                Defina quanto você quer faturar este mês
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Alerta de Leads Parados (dias)
              </label>
              <Input
                type="number"
                placeholder="Ex: 7"
                value={alertDaysInput}
                onChange={(e) => setAlertDaysInput(e.target.value)}
                data-testid="alert-days-input"
              />
              <p className="text-xs text-slate-400">
                Gerar alerta se lead ficar sem contato por X dias
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving} data-testid="save-settings-btn">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
