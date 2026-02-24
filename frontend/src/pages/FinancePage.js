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
import { Plus, DollarSign, TrendingUp, Clock, Check, X, Trash2, RefreshCw, AlertCircle, CalendarClock } from "lucide-react";

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

  // Filtrar pagamentos
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredPayments = payments.filter((p) => {
    if (filterStatus === "paid") return p.paid;
    if (filterStatus === "pending") return !p.paid;
    if (filterStatus === "overdue") {
      const dueDate = new Date(p.due_date);
      return !p.paid && dueDate < today;
    }
    return true;
  });

  // Calcular estatísticas
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyPayments = payments.filter((p) => {
    const dueDate = new Date(p.due_date);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  const totalReceived = monthlyPayments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const totalPending = monthlyPayments.filter((p) => !p.paid).reduce((sum, p) => sum + p.amount, 0);
  
  // MRR - soma de todos os pagamentos recorrentes (ativos)
  const mrr = payments
    .filter((p) => p.payment_type === "recorrente" && !p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  // Pagamentos em atraso
  const overduePayments = payments.filter((p) => {
    const dueDate = new Date(p.due_date);
    return !p.paid && dueDate < today;
  });

  // Próximos vencimentos (7 dias)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const upcomingPayments = payments
    .filter((p) => {
      const dueDate = new Date(p.due_date);
      return !p.paid && dueDate >= today && dueDate <= sevenDaysFromNow;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Função para verificar se está em atraso
  const isOverdue = (payment) => {
    const dueDate = new Date(payment.due_date);
    return !payment.paid && dueDate < today;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="finance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-received">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Recebido no Mês</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
                  {formatCurrency(totalReceived)}
                </p>
                <p className="text-xs text-slate-400 mt-1">pagamentos confirmados</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-pending">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pendente no Mês</p>
                <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                  {formatCurrency(totalPending)}
                </p>
                <p className="text-xs text-slate-400 mt-1">a receber</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-mrr">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">MRR Estimado</p>
                <p className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                  {formatCurrency(mrr)}
                </p>
                <p className="text-xs text-slate-400 mt-1">receita recorrente</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-overdue">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600 mt-1 font-mono">
                  {overduePayments.length}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatCurrency(overduePayments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos Vencimentos */}
        <Card className="lg:col-span-1" data-testid="upcoming-payments">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-600" />
              Próximos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPayments.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum vencimento próximo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPayments.slice(0, 5).map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {payment.client_name}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(payment.due_date)}</p>
                    </div>
                    <p className="font-mono font-semibold text-slate-900 ml-3">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                ))}
                {upcomingPayments.length > 5 && (
                  <p className="text-xs text-slate-400 text-center">
                    +{upcomingPayments.length - 5} mais
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Pagamentos</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] h-9" data-testid="filter-status">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Em Atraso</SelectItem>
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
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.client_name}</p>
                            <p className="text-xs text-slate-400">{payment.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={payment.payment_type === "recorrente" 
                              ? "border-blue-200 text-blue-700 bg-blue-50" 
                              : "border-slate-200 text-slate-600"
                            }
                          >
                            {payment.payment_type === "recorrente" ? (
                              <><RefreshCw className="w-3 h-3 mr-1" /> Recorrente</>
                            ) : (
                              "Pontual"
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(payment.due_date)}
                        </TableCell>
                        <TableCell>
                          {payment.paid ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0">
                              <Check className="w-3 h-3 mr-1" /> Pago
                            </Badge>
                          ) : isOverdue(payment) ? (
                            <Badge className="bg-red-100 text-red-700 border-0">
                              <AlertCircle className="w-3 h-3 mr-1" /> Em Atraso
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-0">
                              <Clock className="w-3 h-3 mr-1" /> Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${payment.paid ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"}`}
                              onClick={() => handleTogglePaid(payment.id, payment.paid)}
                              data-testid={`toggle-paid-${payment.id}`}
                              title={payment.paid ? "Marcar como pendente" : "Marcar como pago"}
                            >
                              {payment.paid ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(payment.id)}
                              data-testid={`delete-payment-${payment.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
