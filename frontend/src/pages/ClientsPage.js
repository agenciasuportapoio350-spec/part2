import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { formatCurrency, formatDate, maskCurrency, parseCurrencyInput } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { toast } from "sonner";
import { Plus, Search, Building, Phone, Mail, DollarSign, ChevronRight, Trash2, RefreshCw, User } from "lucide-react";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, clientId: null });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    contract_value: "",
    plan: "unico",
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
      // Converte valor formatado para número antes de enviar
      const dataToSend = {
        ...formData,
        contract_value: parseCurrencyInput(formData.contract_value),
      };
      await api.post("/clients", dataToSend);
      toast.success("Cliente criado com sucesso!");
      fetchClients();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar cliente");
    }
  };

  const handleDelete = (clientId, e) => {
    e.stopPropagation();
    setConfirmDialog({ open: true, clientId });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/clients/${confirmDialog.clientId}`);
      toast.success("Cliente excluído com sucesso!");
      fetchClients();
    } catch (error) {
      toast.error("Erro ao excluir cliente");
    }
    setConfirmDialog({ open: false, clientId: null });
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      contract_value: "",
      plan: "unico",
      notes: "",
    });
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar clientes por plano
  const clientesRecorrentes = filteredClients.filter(c => c.plan === "recorrente");
  const clientesUnicos = filteredClients.filter(c => c.plan !== "recorrente");

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

      {/* Clientes em 2 Colunas por Plano */}
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
          {/* Coluna Plano Recorrente (Destaque) */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-slate-900">Plano Recorrente</h2>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                {clientesRecorrentes.length} {clientesRecorrentes.length === 1 ? "cliente" : "clientes"}
              </Badge>
            </div>
            {clientesRecorrentes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum cliente recorrente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientesRecorrentes.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onNavigate={() => navigate(`/clients/${client.id}`)}
                    onDelete={(e) => handleDelete(client.id, e)}
                    highlight
                  />
                ))}
              </div>
            )}
          </div>

          {/* Coluna Plano Único */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Plano Único</h2>
              </div>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                {clientesUnicos.length} {clientesUnicos.length === 1 ? "cliente" : "clientes"}
              </Badge>
            </div>
            {clientesUnicos.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum cliente único</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientesUnicos.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onNavigate={() => navigate(`/clients/${client.id}`)}
                    onDelete={(e) => handleDelete(client.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
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
                <Label>Valor do Contrato (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: maskCurrency(e.target.value) })}
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
