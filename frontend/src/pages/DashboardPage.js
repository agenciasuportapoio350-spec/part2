import { useState, useEffect } from "react";
import api from "../lib/api";
import { formatCurrency } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Users, UserCheck, Calendar, DollarSign, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setStats(response.data);
    } catch (error) {
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
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

  const statCards = [
    {
      title: "Leads no Pipeline",
      value: stats?.leads_total || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Clientes Ativos",
      value: stats?.clients_count || 0,
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Tarefas Hoje",
      value: stats?.tasks_today || 0,
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Tarefas Pendentes",
      value: stats?.tasks_pending || 0,
      icon: Clock,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  const financialCards = [
    {
      title: "Receita do Mês",
      value: formatCurrency(stats?.monthly_revenue || 0),
      subtitle: "Pagamentos recebidos",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Receita Pendente",
      value: formatCurrency(stats?.pending_revenue || 0),
      subtitle: "A receber este mês",
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Valor do Pipeline",
      value: formatCurrency(stats?.total_pipeline_value || 0),
      subtitle: "Potencial de vendas",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  const stageLabels = {
    novo_lead: "Novo Lead",
    contato_feito: "Contato Feito",
    reuniao: "Reunião",
    proposta: "Proposta",
    fechado: "Fechado",
    perdido: "Perdido",
  };

  return (
    <div className="p-6 md:p-8 space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1 font-mono">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Stats */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Financeiro</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {financialCards.map((stat, index) => (
            <Card key={index} className="border-slate-200 shadow-sm" data-testid={`financial-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pipeline Overview */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Pipeline de Vendas</h2>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {Object.entries(stageLabels).map(([key, label]) => (
                <div key={key} className="text-center p-4 rounded-lg bg-slate-50">
                  <p className="text-2xl font-bold text-slate-900 font-mono">
                    {stats?.leads_by_stage?.[key] || 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
