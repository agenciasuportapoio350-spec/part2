import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, Clock, ClipboardList, Phone, Building, ChevronRight, MessageCircle } from "lucide-react";

export default function OperationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "atrasados");

  useEffect(() => {
    fetchOperations();
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchOperations = async () => {
    try {
      const response = await api.get("/operations/stats");
      setData(response.data);
    } catch (error) {
      toast.error("Erro ao carregar operações");
    } finally {
      setLoading(false);
    }
  };

  const ClientCard = ({ client, type }) => (
    <Card 
      className="card-hover cursor-pointer group"
      onClick={() => navigate(`/clients/${client.id}`)}
      data-testid={`operation-client-${client.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
            {client.company && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <Building className="w-3.5 h-3.5" />
                <span className="truncate">{client.company}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <Phone className="w-3.5 h-3.5" />
                <span>{client.phone}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const phone = client.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/55${phone}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={type === "atrasados" ? "destructive" : type === "pendentes" ? "warning" : "secondary"}
              className="font-mono text-xs"
            >
              {type === "onboarding" ? client.checklist_progress : client.weekly_progress}
            </Badge>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="operations-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Operação</h1>
        <p className="text-slate-500 mt-1">Acompanhe o status dos clientes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all ${activeTab === "atrasados" ? "ring-2 ring-red-500" : "hover:shadow-md"}`}
          onClick={() => handleTabChange("atrasados")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{data?.counts?.atrasados || 0}</div>
              <div className="text-sm text-slate-500">Atrasados</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${activeTab === "pendentes" ? "ring-2 ring-amber-500" : "hover:shadow-md"}`}
          onClick={() => handleTabChange("pendentes")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{data?.counts?.pendentes_semana || 0}</div>
              <div className="text-sm text-slate-500">Pendentes na Semana</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${activeTab === "onboarding" ? "ring-2 ring-slate-500" : "hover:shadow-md"}`}
          onClick={() => handleTabChange("onboarding")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-slate-100">
              <ClipboardList className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-600">{data?.counts?.onboarding_pendente || 0}</div>
              <div className="text-sm text-slate-500">Onboarding Pendente</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Lists */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="atrasados" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Atrasados
            {data?.counts?.atrasados > 0 && (
              <Badge variant="destructive" className="ml-1">{data.counts.atrasados}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendentes
            {data?.counts?.pendentes_semana > 0 && (
              <Badge className="ml-1 bg-amber-500">{data.counts.pendentes_semana}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Onboarding
            {data?.counts?.onboarding_pendente > 0 && (
              <Badge variant="secondary" className="ml-1">{data.counts.onboarding_pendente}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atrasados">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Checklist Semanal Atrasado
              </CardTitle>
              <p className="text-sm text-slate-500">Clientes recorrentes que não completaram o checklist da semana anterior</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.atrasados?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum cliente atrasado</p>
                </div>
              ) : (
                data?.atrasados?.map((client) => (
                  <ClientCard key={client.id} client={client} type="atrasados" />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Pendentes na Semana
              </CardTitle>
              <p className="text-sm text-slate-500">Clientes recorrentes com tarefas da semana ainda não concluídas</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.pendentes_semana?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhum cliente pendente esta semana</p>
                </div>
              ) : (
                data?.pendentes_semana?.map((client) => (
                  <ClientCard key={client.id} client={client} type="pendentes" />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-600" />
                Onboarding Pendente
              </CardTitle>
              <p className="text-sm text-slate-500">Clientes únicos com checklist de onboarding incompleto</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.onboarding_pendente?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Todos os clientes únicos completaram o onboarding</p>
                </div>
              ) : (
                data?.onboarding_pendente?.map((client) => (
                  <ClientCard key={client.id} client={client} type="onboarding" />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
