import { useState, useEffect } from "react";
import api from "../../lib/api";
import { formatCurrency } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Users, UserCheck, Target, ListTodo, DollarSign, AlertTriangle, Clock, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/events?limit=10")
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados do admin");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      title: "Total de Usuários", 
      value: stats?.total_users || 0, 
      icon: Users, 
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    { 
      title: "Clientes Cadastrados", 
      value: stats?.total_clients || 0, 
      icon: UserCheck, 
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20"
    },
    { 
      title: "Leads no Pipeline", 
      value: stats?.total_leads || 0, 
      icon: Target, 
      color: "text-violet-400",
      bgColor: "bg-violet-500/20"
    },
    { 
      title: "Tarefas Totais", 
      value: stats?.total_tasks || 0, 
      icon: ListTodo, 
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20"
    },
  ];

  const financialCards = [
    { 
      title: "MRR (Receita Mensal)", 
      value: formatCurrency(stats?.mrr || 0), 
      icon: DollarSign, 
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20"
    },
    { 
      title: "Inadimplentes", 
      value: stats?.overdue_count || 0, 
      subtitle: "usuários com pagamento em atraso",
      icon: AlertTriangle, 
      color: "text-amber-400",
      bgColor: "bg-amber-500/20"
    },
    { 
      title: "Usuários Bloqueados", 
      value: stats?.blocked_users || 0, 
      icon: Users, 
      color: "text-red-400",
      bgColor: "bg-red-500/20"
    },
  ];

  const getEventIcon = (type) => {
    switch (type) {
      case "new_user": return Users;
      case "new_client": return UserCheck;
      case "audit": return Activity;
      default: return Clock;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case "new_user": return "text-blue-400";
      case "new_client": return "text-emerald-400";
      case "audit": return "text-amber-400";
      default: return "text-slate-400";
    }
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `há ${minutes} min`;
    if (hours < 24) return `há ${hours}h`;
    return `há ${days}d`;
  };

  return (
    <div className="p-6 md:p-8 space-y-8" data-testid="admin-dashboard-page">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Admin</h1>
        <p className="text-slate-400 mt-1">Visão geral do sistema</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-slate-800 border-slate-700" data-testid={`admin-stat-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1 font-mono">
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
        <h2 className="text-xl font-semibold text-white mb-4">Financeiro</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {financialCards.map((stat, index) => (
            <Card key={index} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                    )}
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

      {/* Users by Plan */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Usuários por Plano</h2>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats?.users_by_plan && Object.entries(stats.users_by_plan).map(([plan, count]) => (
                <div key={plan} className="text-center p-4 rounded-lg bg-slate-700/50">
                  <p className="text-2xl font-bold text-white font-mono">{count}</p>
                  <p className="text-xs text-slate-400 mt-1 capitalize">{plan}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Últimos Eventos</h2>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Nenhum evento recente
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {events.map((event, index) => {
                  const Icon = getEventIcon(event.type);
                  return (
                    <div key={index} className="flex items-center gap-4 p-4 hover:bg-slate-700/50 transition-colors">
                      <div className={`w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${getEventColor(event.type)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{event.message}</p>
                        {event.email && (
                          <p className="text-xs text-slate-400 truncate">{event.email}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
