import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { formatDate, formatCurrency } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Mail, Calendar, Shield, CreditCard, Users, Target, DollarSign, LogIn, Ban, UserCog, Key, Trash2, Edit, Loader2, Pause, Play } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { impersonate } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Form states
  const [selectedRole, setSelectedRole] = useState("");
  const [planForm, setPlanForm] = useState({
    plan: "free",
    plan_value: 0,
    plan_status: "active",
    plan_expires_at: ""
  });
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/admin/users/${id}`);
      setUser(response.data);
      setSelectedRole(response.data.role);
      setPlanForm({
        plan: response.data.plan || "free",
        plan_value: response.data.plan_value || 0,
        plan_status: response.data.plan_status || "active",
        plan_expires_at: response.data.plan_expires_at?.split("T")[0] || ""
      });
      setProfileForm({
        name: response.data.name,
        email: response.data.email
      });
    } catch (error) {
      toast.error("Erro ao carregar usuário");
      navigate("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = user.status === "active" ? "blocked" : "active";
    if (!window.confirm(`Tem certeza que deseja ${newStatus === "blocked" ? "bloquear" : "desbloquear"} este usuário?`)) return;
    
    try {
      await api.put(`/admin/users/${id}/status`, { status: newStatus });
      toast.success(`Usuário ${newStatus === "blocked" ? "bloqueado" : "desbloqueado"}`);
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar status");
    }
  };

  const handleChangeRole = async () => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: selectedRole });
      toast.success("Role alterada com sucesso");
      setRoleModalOpen(false);
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao alterar role");
    }
  };

  const handleChangePlan = async () => {
    try {
      await api.put(`/admin/users/${id}/plan`, planForm);
      toast.success("Plano alterado com sucesso");
      setPlanModalOpen(false);
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao alterar plano");
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await api.put(`/admin/users/${id}/profile`, profileForm);
      toast.success("Perfil atualizado com sucesso");
      setProfileModalOpen(false);
      fetchUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar perfil");
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    try {
      await api.put(`/admin/users/${id}/password`, { new_password: newPassword });
      toast.success("Senha redefinida com sucesso");
      setPasswordModalOpen(false);
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao redefinir senha");
    }
  };

  const handleDeleteUser = async () => {
    if (confirmDelete !== user.email) {
      toast.error("Digite o email corretamente para confirmar");
      return;
    }
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Usuário excluído com sucesso");
      navigate("/admin/users");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao excluir usuário");
    }
  };

  const handleImpersonate = async () => {
    if (!window.confirm(`Entrar como "${user.name}"?`)) return;
    try {
      await impersonate(id);
      toast.success(`Entrando como ${user.name}`);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao impersonar usuário");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) return null;

  const getStatusBadge = (status) => {
    if (status === "active") {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Ativo</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 border-0">Bloqueado</Badge>;
  };

  const getPlanStatusBadge = (status) => {
    const colors = {
      active: "bg-emerald-500/20 text-emerald-400",
      overdue: "bg-amber-500/20 text-amber-400",
      canceled: "bg-red-500/20 text-red-400",
    };
    return <Badge className={`${colors[status] || colors.active} border-0 capitalize`}>{status}</Badge>;
  };

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="admin-user-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/admin/users")}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          data-testid="admin-back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">{user.name}</h1>
          <p className="text-slate-400 flex items-center gap-2 mt-1">
            <Mail className="w-4 h-4" />
            {user.email}
          </p>
        </div>
        {!isSuperAdmin && (
          <Button 
            onClick={handleImpersonate}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 gap-2"
            data-testid="impersonate-btn"
          >
            <LogIn className="w-4 h-4" />
            Impersonar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status</span>
              {getStatusBadge(user.status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Role</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-0">{user.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Criado em</span>
              <span className="text-white font-mono text-sm">{formatDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Último login</span>
              <span className="text-white font-mono text-sm">
                {user.last_login_at ? formatDate(user.last_login_at) : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Plano</span>
              <Badge className="bg-violet-500/20 text-violet-400 border-0 capitalize">{user.plan}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Valor</span>
              <span className="text-white font-mono">{formatCurrency(user.plan_value || 0)}/mês</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status</span>
              {getPlanStatusBadge(user.plan_status)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vencimento</span>
              <span className="text-white font-mono text-sm">
                {user.plan_expires_at ? formatDate(user.plan_expires_at) : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> Clientes
              </span>
              <span className="text-white font-mono">{user.stats?.clients_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Target className="w-4 h-4" /> Leads
              </span>
              <span className="text-white font-mono">{user.stats?.leads_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Tarefas
              </span>
              <span className="text-white font-mono">{user.stats?.tasks_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Pagamentos
              </span>
              <span className="text-white font-mono">{formatCurrency(user.stats?.payments_total || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Ações de Administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2 h-auto py-4 flex-col"
              onClick={() => setProfileModalOpen(true)}
              data-testid="edit-profile-btn"
            >
              <Edit className="w-5 h-5" />
              <span className="text-xs">Editar Perfil</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2 h-auto py-4 flex-col"
              onClick={() => setPasswordModalOpen(true)}
              data-testid="reset-password-btn"
            >
              <Key className="w-5 h-5" />
              <span className="text-xs">Trocar Senha</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2 h-auto py-4 flex-col"
              onClick={() => setRoleModalOpen(true)}
              disabled={isSuperAdmin}
              data-testid="change-role-btn"
            >
              <Shield className="w-5 h-5" />
              <span className="text-xs">Alterar Role</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2 h-auto py-4 flex-col"
              onClick={() => setPlanModalOpen(true)}
              data-testid="change-plan-btn"
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Alterar Plano</span>
            </Button>
            
            <Button 
              variant="outline" 
              className={`gap-2 h-auto py-4 flex-col ${user.status === "active" ? "border-amber-600 text-amber-400 hover:bg-amber-950" : "border-emerald-600 text-emerald-400 hover:bg-emerald-950"}`}
              onClick={handleToggleStatus}
              disabled={isSuperAdmin}
              data-testid="toggle-status-btn"
            >
              <Ban className="w-5 h-5" />
              <span className="text-xs">{user.status === "active" ? "Bloquear" : "Desbloquear"}</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="border-red-600 text-red-400 hover:bg-red-950 gap-2 h-auto py-4 flex-col"
              onClick={() => setDeleteModalOpen(true)}
              disabled={isSuperAdmin}
              data-testid="delete-user-btn"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs">Excluir</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileModalOpen(false)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={handleUpdateProfile} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Trocar Senha</DialogTitle>
            <DialogDescription className="text-slate-400">
              Digite uma nova senha para o usuário. Mínimo 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-700 border-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={handleChangeRole} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Modal */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Plano</Label>
                <Select value={planForm.plan} onValueChange={(v) => setPlanForm({ ...planForm, plan: v })}>
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
              <div className="space-y-2">
                <Label className="text-slate-300">Valor Mensal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={planForm.plan_value}
                  onChange={(e) => setPlanForm({ ...planForm, plan_value: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select value={planForm.plan_status} onValueChange={(v) => setPlanForm({ ...planForm, plan_status: v })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="overdue">Em Atraso</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Vencimento</Label>
                <Input
                  type="date"
                  value={planForm.plan_expires_at}
                  onChange={(e) => setPlanForm({ ...planForm, plan_expires_at: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanModalOpen(false)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir Usuário</DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta ação é irreversível! Todos os dados do usuário serão excluídos (leads, clientes, tarefas, pagamentos).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">
                Para confirmar, digite o email do usuário: <strong>{user.email}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Confirmar Email</Label>
              <Input
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                className="bg-slate-700 border-slate-600"
                placeholder={user.email}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteModalOpen(false); setConfirmDelete(""); }} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteUser} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={confirmDelete !== user.email}
            >
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
