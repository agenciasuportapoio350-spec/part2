import { useState, useEffect } from "react";
import api from "../lib/api";
import { formatCurrency, formatDate, PAYMENT_TYPES } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, Clock, Check, X, Trash2 } from "lucide-react";

export default function FinancePage() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    client_id: "",
    description: "",
    amount: 0,
    payment_type: "pontual",
    due_date: new Date().toISOString().split("T")[0],
    paid: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, clientsRes] = await Promise.all([
        api.get("/payments"),
        api.get("/clients"),
      ]);
      setPayments(paymentsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error("Selecione um cliente");
      return;
    }
    try {
      await api.post("/payments", formData);
      toast.success("Pagamento criado com sucesso!");
      fetchData();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar pagamento");
    }
  };

  const handleTogglePaid = async (paymentId, currentStatus) => {
    try {
      await api.put(`/payments/${paymentId}`, { paid: !currentStatus });
      fetchData();
      toast.success(currentStatus ? "Pagamento marcado como pendente" : "Pagamento confirmado!");
    } catch (error) {
      toast.error("Erro ao atualizar pagamento");
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm("Tem certeza que deseja excluir este pagamento?")) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      toast.success("Pagamento excluído!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir pagamento");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      client_id: "",
      description: "",
      amount: 0,
      payment_type: "pontual",
      due_date: new Date().toISOString().split("T")[0],
      paid: false,
    });
  };

  const filteredPayments = payments.filter((p) => {
    if (filterStatus === "paid") return p.paid;
    if (filterStatus === "pending") return !p.paid;
    return true;
  });

  // Calculate stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyPayments = payments.filter((p) => {
    const dueDate = new Date(p.due_date);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  const totalReceived = monthlyPayments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const totalPending = monthlyPayments.filter((p) => !p.paid).reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = totalReceived + totalPending;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="finance-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financeiro</h1>
          <p className="text-slate-500 mt-1">Controle de pagamentos e receitas</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2" data-testid="add-payment-btn">
          <Plus className="w-4 h-4" />
          Novo Pagamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stat-received">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Recebido no Mês</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1 font-mono">
                  {formatCurrency(totalReceived)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pendente no Mês</p>
                <p className="text-3xl font-bold text-amber-600 mt-1 font-mono">
                  {formatCurrency(totalPending)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-expected">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Receita Prevista</p>
                <p className="text-3xl font-bold text-blue-600 mt-1 font-mono">
                  {formatCurrency(totalExpected)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pagamentos</CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]" data-testid="filter-status">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Nenhum pagamento encontrado</p>
              <p className="text-sm mt-1">Crie um novo pagamento para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                      <TableCell className="font-medium">{payment.client_name}</TableCell>
                      <TableCell className="text-slate-600">{payment.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={payment.payment_type === "recorrente" ? "border-emerald-200 text-emerald-700" : "border-blue-200 text-blue-700"}>
                          {PAYMENT_TYPES[payment.payment_type]?.label || payment.payment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-slate-500">
                        {formatDate(payment.due_date)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1.5 ${payment.paid ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"}`}
                          onClick={() => handleTogglePaid(payment.id, payment.paid)}
                          data-testid={`toggle-paid-${payment.id}`}
                        >
                          {payment.paid ? (
                            <>
                              <Check className="w-4 h-4" />
                              Pago
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Pendente
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(payment.id)}
                          data-testid={`delete-payment-${payment.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" data-testid="payment-modal">
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger data-testid="payment-client-select">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Ex: Mensalidade Janeiro"
                data-testid="payment-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                  data-testid="payment-amount-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                >
                  <SelectTrigger data-testid="payment-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pontual">Pontual</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
                data-testid="payment-due-date-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="payment-submit-btn">
                Criar Pagamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
