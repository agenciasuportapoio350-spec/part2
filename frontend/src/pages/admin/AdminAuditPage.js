import { useState, useEffect } from "react";
import api from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";
import { FileText, Ban, UserCog, CreditCard, LogIn, Key, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";

const ACTION_LABELS = {
  block_user: { label: "Bloquear Usuário", icon: Ban, color: "text-red-400" },
  unblock_user: { label: "Desbloquear Usuário", icon: Ban, color: "text-emerald-400" },
  change_role: { label: "Alterar Role", icon: UserCog, color: "text-blue-400" },
  change_plan: { label: "Alterar Plano", icon: CreditCard, color: "text-violet-400" },
  impersonate: { label: "Impersonar", icon: LogIn, color: "text-amber-400" },
  reset_password: { label: "Reset de Senha", icon: Key, color: "text-cyan-400" },
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.append("action", actionFilter);
      
      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const config = ACTION_LABELS[action] || { label: action, icon: FileText, color: "text-slate-400" };
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="text-slate-200">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="admin-audit-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Logs de Auditoria</h1>
          <p className="text-slate-400 mt-1">{total} registros encontrados</p>
        </div>
        <Button 
          variant="outline" 
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={() => { setLoading(true); fetchLogs(); }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-60 bg-slate-700 border-slate-600 text-white" data-testid="audit-action-filter">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="block_user">Bloquear Usuário</SelectItem>
                <SelectItem value="unblock_user">Desbloquear Usuário</SelectItem>
                <SelectItem value="change_role">Alterar Role</SelectItem>
                <SelectItem value="change_plan">Alterar Plano</SelectItem>
                <SelectItem value="impersonate">Impersonar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Data/Hora</TableHead>
                    <TableHead className="text-slate-400">Administrador</TableHead>
                    <TableHead className="text-slate-400">Ação</TableHead>
                    <TableHead className="text-slate-400">Usuário Afetado</TableHead>
                    <TableHead className="text-slate-400">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="border-slate-700 hover:bg-slate-700/50"
                      data-testid={`audit-log-${log.id}`}
                    >
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="text-slate-300">{log.actor_email}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-slate-300">{log.target_email}</TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <code className="bg-slate-700 px-2 py-1 rounded text-xs">
                            {JSON.stringify(log.details)}
                          </code>
                        ) : (
                          "-"
                        )}
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
  );
}
