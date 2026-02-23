import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { toast } from "sonner";
import { Search, MoreVertical, Eye, Ban, LogIn, RefreshCw, Plus, UserPlus, Pause, Play } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { impersonate } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    plan: "free",
    plan_value: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, planFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (planFilter !== "all") params.append("plan", planFilter);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`Usuário ${newStatus === "blocked" ? "bloqueado" : "ativado"}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar status");
    }
  };

  const handlePauseUser = async (userId, currentStatus) => {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`Usuário ${newStatus === "paused" ? "pausado" : "ativado"}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar status");
    }
  };

  const handleImpersonate = async (userId, userName) => {
    if (!window.confirm(`Entrar como "${userName}"? Você poderá visualizar a conta deste usuário.`)) return;
    try {
      await impersonate(userId);
      toast.success(`Entrando como ${userName}`);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao impersonar usuário");
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (newUserForm.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    try {
      await api.post("/admin/users", newUserForm);
      toast.success("Usuário criado com sucesso");
      setCreateModalOpen(false);
      setNewUserForm({
        name: "",
        email: "",
        password: "",
        role: "USER",
        plan: "free",
        plan_value: 0
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar usuário");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "active") {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Ativo</Badge>;
    }
    if (status === "paused") {
      return <Badge className="bg-amber-500/20 text-amber-400 border-0">Pausado</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-0">Bloqueado</Badge>;
  };

  const getPlanBadge = (plan) => {
    const colors = {
      free: "bg-slate-500/20 text-slate-400",
      starter: "bg-blue-500/20 text-blue-400",
      pro: "bg-violet-500/20 text-violet-400",
      enterprise: "bg-amber-500/20 text-amber-400",
    };
    return <Badge className={`${colors[plan] || colors.free} border-0 capitalize`}>{plan}</Badge>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      USER: "bg-slate-500/20 text-slate-400",
      ADMIN: "bg-blue-500/20 text-blue-400",
      SUPER_ADMIN: "bg-amber-500/20 text-amber-400",
    };
    return <Badge className={`${colors[role] || colors.USER} border-0`}>{role}</Badge>;
  };

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="admin-users-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Usuários</h1>
          <p className="text-slate-400 mt-1">{total} usuários cadastrados</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => fetchUsers()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2"
            onClick={() => setCreateModalOpen(true)}
            data-testid="create-user-btn"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                data-testid="admin-user-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white" data-testid="admin-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white" data-testid="admin-plan-filter">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Nenhum usuário encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Nome</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400">Plano</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Criado em</TableHead>
                    <TableHead className="text-slate-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow 
                      key={user.id} 
                      className="border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      data-testid={`admin-user-row-${user.id}`}
                    >
                      <TableCell className="font-medium text-white">{user.name}</TableCell>
                      <TableCell className="text-slate-300">{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getPlanBadge(user.plan)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-slate-400 font-mono text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-700 border-slate-600">
                            <DropdownMenuItem 
                              className="text-slate-200 focus:bg-slate-600 focus:text-white cursor-pointer"
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {user.role !== "SUPER_ADMIN" && (
                              <>
                                <DropdownMenuItem 
                                  className="text-slate-200 focus:bg-slate-600 focus:text-white cursor-pointer"
                                  onClick={() => handleToggleStatus(user.id, user.status)}
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  {user.status === "active" ? "Bloquear" : "Desbloquear"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-600" />
                                <DropdownMenuItem 
                                  className="text-amber-400 focus:bg-slate-600 focus:text-amber-300 cursor-pointer"
                                  onClick={() => handleImpersonate(user.id, user.name)}
                                >
                                  <LogIn className="w-4 h-4 mr-2" />
                                  Impersonar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-300">Nome *</Label>
                <Input
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Nome completo"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-300">Email *</Label>
                <Input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-300">Senha *</Label>
                <Input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Role</Label>
                <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Plano</Label>
                <Select value={newUserForm.plan} onValueChange={(v) => setNewUserForm({ ...newUserForm, plan: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-300">Valor do Plano (R$/mês)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newUserForm.plan_value}
                  onChange={(e) => setNewUserForm({ ...newUserForm, plan_value: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
