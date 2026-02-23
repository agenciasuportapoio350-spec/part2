import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Building, Phone, Mail, DollarSign, ChevronRight, Trash2 } from "lucide-react";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contract_value: 0,
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

  const handleDelete = async (clientId, e) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este cliente? Isso também excluirá as tarefas e pagamentos relacionados.")) return;
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success("Cliente excluído com sucesso!");
      fetchClients();
    } catch (error) {
      toast.error("Erro ao excluir cliente");
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
      notes: "",
    });
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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

      {/* Clients Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => handleDelete(client.id, e)}
                      data-testid={`delete-client-${client.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-500">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
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
          ))}
        </div>
      )}

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
                <Label>Valor do Contrato</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
                  data-testid="client-value-input"
                />
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
