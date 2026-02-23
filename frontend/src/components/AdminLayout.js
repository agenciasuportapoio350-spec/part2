import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut,
  ArrowLeft,
  Shield
} from "lucide-react";
import { Button } from "./ui/button";

const adminNavItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { path: "/admin/users", icon: Users, label: "Usuários" },
  { path: "/admin/audit", icon: FileText, label: "Auditoria" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Admin Master
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Painel de Controle</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? "bg-amber-500/20 text-amber-500" 
                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }`
              }
              data-testid={`admin-nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-700 mb-2"
            onClick={() => navigate("/")}
            data-testid="back-to-app-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao App
          </Button>
          
          <div className="flex items-center gap-3 py-3 px-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-500 font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={handleLogout}
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-900">
        <Outlet />
      </main>
    </div>
  );
}
