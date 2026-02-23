import { useState, useEffect } from "react";
import api from "../lib/api";
import { formatCurrency, formatDate, PIPELINE_STAGES } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, MoreVertical, Phone, Mail, Building, Calendar, DollarSign, Bell, Trash2, UserCheck, GripVertical } from "lucide-react";

const STAGES_ORDER = ["novo_lead", "contato_feito", "reuniao", "proposta", "fechado", "perdido"];

export default function CRMPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    stage: "novo_lead",
    contract_value: 0,
    next_contact: "",
    reminder: "",
    notes: "",
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get("/leads");
      setLeads(response.data);
    } catch (error) {
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await api.put(`/leads/${editingLead.id}`, formData);
        toast.success("Lead atualizado com sucesso!");
      } else {
        await api.post("/leads", formData);
        toast.success("Lead criado com sucesso!");
      }
      fetchLeads();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar lead");
    }
  };

  const handleDelete = async (leadId) => {
    if (!window.confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      await api.delete(`/leads/${leadId}`);
      toast.success("Lead excluído com sucesso!");
      fetchLeads();
    } catch (error) {
      toast.error("Erro ao excluir lead");
    }
  };

  const handleConvert = async (leadId) => {
    try {
      await api.post(`/leads/${leadId}/convert`);
      toast.success("Lead convertido em cliente! Checklist e tarefas criados.");
      fetchLeads();
    } catch (error) {
      toast.error("Erro ao converter lead");
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      await api.put(`/leads/${leadId}`, { stage: newStage });
      fetchLeads();
      toast.success("Estágio atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar estágio");
    }
  };

  const openModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        stage: lead.stage,
        contract_value: lead.contract_value,
        next_contact: lead.next_contact || "",
        reminder: lead.reminder || "",
        notes: lead.notes || "",
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        stage: "novo_lead",
        contract_value: 0,
        next_contact: "",
        reminder: "",
        notes: "",
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLead(null);
  };

  const getLeadsByStage = (stage) => leads.filter((l) => l.stage === stage);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="flex gap-6 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="min-w-[320px] h-96 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="crm-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CRM</h1>
          <p className="text-slate-500 mt-1">Pipeline de vendas</p>
        </div>
        <Button onClick={() => openModal()} className="gap-2" data-testid="add-lead-btn">
          <Plus className="w-4 h-4" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory">
        {STAGES_ORDER.map((stage) => (
          <div key={stage} className="kanban-column snap-center" data-testid={`column-${stage}`}>
            <div className="kanban-column-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-${PIPELINE_STAGES[stage]?.color || 'slate'}-500`} />
                <span>{PIPELINE_STAGES[stage]?.label || stage}</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {getLeadsByStage(stage).length}
              </Badge>
            </div>
            <div className="kanban-column-body">
              {getLeadsByStage(stage).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Nenhum lead
                </div>
              ) : (
                getLeadsByStage(stage).map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onEdit={() => openModal(lead)}
                    onDelete={() => handleDelete(lead.id)}
                    onConvert={() => handleConvert(lead.id)}
                    onStageChange={handleStageChange}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" data-testid="lead-modal">
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Editar Lead" : "Novo Lead"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="lead-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="lead-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="lead-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  data-testid="lead-company-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Estágio</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger data-testid="lead-stage-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES_ORDER.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {PIPELINE_STAGES[stage]?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do Contrato</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
                  data-testid="lead-value-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Próximo Contato</Label>
                <Input
                  type="date"
                  value={formData.next_contact}
                  onChange={(e) => setFormData({ ...formData, next_contact: e.target.value })}
                  data-testid="lead-next-contact-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Lembrete</Label>
                <Input
                  value={formData.reminder}
                  onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                  placeholder="Ex: Ligar amanhã às 14h"
                  data-testid="lead-reminder-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="lead-notes-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="lead-submit-btn">
                {editingLead ? "Salvar" : "Criar Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadCard({ lead, onEdit, onDelete, onConvert, onStageChange }) {
  return (
    <div className="lead-card group" data-testid={`lead-card-${lead.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <h3 className="font-semibold text-slate-900 truncate max-w-[180px]">{lead.name}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`lead-menu-${lead.id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
            {lead.stage !== "fechado" && lead.stage !== "perdido" && (
              <DropdownMenuItem onClick={onConvert}>
                <UserCheck className="w-4 h-4 mr-2" />
                Converter em Cliente
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {lead.company && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Building className="w-3.5 h-3.5" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}

      {lead.phone && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Phone className="w-3.5 h-3.5" />
          <span>{lead.phone}</span>
        </div>
      )}

      {lead.email && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate">{lead.email}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <DollarSign className="w-4 h-4" />
          <span className="font-mono font-semibold text-sm">
            {formatCurrency(lead.contract_value)}
          </span>
        </div>

        {lead.next_contact && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(lead.next_contact)}</span>
          </div>
        )}
      </div>

      {lead.reminder && (
        <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs bg-amber-50 px-2 py-1 rounded">
          <Bell className="w-3.5 h-3.5" />
          <span className="truncate">{lead.reminder}</span>
        </div>
      )}
    </div>
  );
}
