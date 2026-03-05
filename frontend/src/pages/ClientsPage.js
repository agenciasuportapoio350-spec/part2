import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { toast } from "sonner";
import { Plus, Search, Building, Phone, Mail, DollarSign, ChevronRight, Trash2, MessageCircle, RefreshCw, User } from "lucide-react";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, client: null });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contract_value: 0,
    plan: "recorrente",
    notes: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/clients", formData);
      toast.success("Cliente criado com sucesso!");
      fetchClients();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar cliente");
    }
  };

  const handleDeleteClick = (client, e) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, client });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.client) return;
    try {
      await api.delete(`/clients/${deleteConfirm.client.id}`);
      toast.success("Cliente excluído com sucesso!");
      fetchClients();
    } catch (error) {
      toast.error("Erro ao excluir cliente");
    } finally {
      setDeleteConfirm({ open: false, client: null });
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      contract_value: 0,
      plan: "recorrente",
      notes: "",
    });
  };

  const getPlanBadge = (plan) => {
    if (plan === "unico") {
      return <Badge variant="outline" className="text-xs border-slate-300 text-slate-600"><User className="w-3 h-3 mr-1" />Único</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 bg-blue-50"><RefreshCw className="w-3 h-3 mr-1" />Recorrente</Badge>;
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar clientes por plano
  const clientesRecorrentes = filteredClients.filter(c => c.plan === "recorrente");
  const clientesUnicos = filteredClients.filter(c => c.plan !== "recorrente"); // inclui "unico" e undefined

  const ClientCard = ({ client }) => (
    <Card
      className="card-hover cursor-pointer group"
      onClick={() => navigate(`/clients/${client.id}`)}
      data-testid={`client-card-${client.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">{client.name}</h3>
            {client.company && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <Building className="w-4 h-4" />
                <span>{client.company}</span>
              </div>
            )}
            <div className="mt-2">
              {getPlanBadge(client.plan)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={(e) => handleDeleteClick(client, e)}
              data-testid={`delete-client-${client.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-500">
          {client.phone && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{client.phone}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  const phone = client.phone.replace(/\D/g, '');
                  window.open(`https://wa.me/55${phone}`, '_blank');
                }}
                title="Abrir WhatsApp"
                data-testid={`whatsapp-client-${client.id}`}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <DollarSign className="w-4 h-4" />
            <span className="font-mono font-semibold">
              {formatCurrency(client.contract_value)}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Desde {formatDate(client.created_at)}
          </div>
        </div>

        {/* Checklist Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Checklist</span>
            <span>
              {client.checklist?.filter((i) => i.completed).length || 0}/{client.checklist?.length || 0}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{
                width: `${client.checklist?.length ? (client.checklist.filter((i) => i.completed).length / client.checklist.length) * 100 : 0}%`,
              }}
            />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="clients-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie seus clientes ativos</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2" data-testid="add-client-btn">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar por nome, empresa ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
          data-testid="client-search-input"
        />
      </div>

      {/* Clients Grid - Separado por Plano */}
      {filteredClients.length === 0 ? (
        <div className="empty-state">
          <Building className="empty-state-icon" />
          <p className="empty-state-title">
            {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </p>
          <p className="empty-state-description">
            {searchTerm ? "Tente outro termo de busca" : "Crie seu primeiro cliente ou converta um lead"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna Recorrentes */}
          <div>
            <Card className="mb-4 border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  Plano Recorrente
                  <Badge variant="secondary" className="ml-2 font-mono">{clientesRecorrentes.length}</Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-4">
              {clientesRecorrentes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum cliente recorrente</p>
                </div>
              ) : (
                clientesRecorrentes.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))
              )}
            </div>
          </div>

          {/* Coluna Únicos */}
          <div>
            <Card className="mb-4 border-slate-200 bg-slate-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-600" />
                  Plano Único
                  <Badge variant="secondary" className="ml-2 font-mono">{clientesUnicos.length}</Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            <div className="space-y-4">
              {clientesUnicos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum cliente único</p>
                </div>
              ) : (
                clientesUnicos.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Excluir Cliente"
        description={`Tem certeza que deseja excluir ${deleteConfirm.client?.name}? Isso também excluirá as tarefas e pagamentos relacionados. Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />

      {/* New Client Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" data-testid="client-modal">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="client-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="client-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="client-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  data-testid="client-company-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor do Contrato (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.contract_value || ""}
                  onChange={(e) => setFormData({ ...formData, contract_value: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                  data-testid="client-value-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Plano do Cliente *</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger data-testid="client-plan-select">
                    <SelectValue placeholder="Selecione o plano" />
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
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="client-notes-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="client-submit-btn">
                Criar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
