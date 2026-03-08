import { useState, useEffect } from "react";
import api from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { toast } from "sonner";
import { UserCheck, UserX, Clock, Mail, Calendar } from "lucide-react";

export default function AdminPendingUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, action: null });

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const response = await api.get("/admin/users/pending");
      setUsers(response.data);
    } catch (error) {
      toast.error("Erro ao carregar usuários pendentes");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (user, action) => {
    setConfirmDialog({ open: true, user, action });
  };

  const handleConfirm = async () => {
    const { user, action } = confirmDialog;
    if (!user || !action) return;

    try {
      await api.post(`/admin/users/${user.id}/${action}`);
      toast.success(action === "approve" ? `${user.name} aprovado com sucesso!` : `${user.name} rejeitado`);
      fetchPendingUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao processar ação");
    } finally {
      setConfirmDialog({ open: false, user: null, action: null });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="admin-pending-users-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Usuários Pendentes</h1>
        <p className="text-slate-500 mt-1">Aprove ou rejeite novos cadastros</p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-lg text-slate-500">Nenhum usuário aguardando aprovação</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Badge variant="secondary" className="mb-4">
            {users.length} usuário(s) aguardando
          </Badge>
          
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow" data-testid={`pending-user-${user.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900">{user.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                      <Calendar className="w-4 h-4" />
                      Cadastrado em {formatDateTime(user.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => handleAction(user, "reject")}
                      data-testid={`reject-user-${user.id}`}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAction(user, "approve")}
                      data-testid={`approve-user-${user.id}`}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.action === "approve" ? "Aprovar Usuário" : "Rejeitar Usuário"}
        description={
          confirmDialog.action === "approve"
            ? `Deseja aprovar ${confirmDialog.user?.name}? O usuário poderá acessar o sistema.`
            : `Deseja rejeitar ${confirmDialog.user?.name}? O usuário será bloqueado.`
        }
        confirmText={confirmDialog.action === "approve" ? "Aprovar" : "Rejeitar"}
        variant={confirmDialog.action === "reject" ? "destructive" : "default"}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
