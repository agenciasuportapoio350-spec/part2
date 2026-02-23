import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  LogOut,
  Menu,
  X,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/crm", icon: Users, label: "CRM" },
  { path: "/clients", icon: UserCheck, label: "Clientes" },
  { path: "/agenda", icon: Calendar, label: "Agenda" },
  { path: "/finance", icon: DollarSign, label: "Financeiro" },
];

export default function Layout() {
  const { user, logout, isSuperAdmin, isImpersonating, exitImpersonate } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleExitImpersonate = async () => {
    await exitImpersonate();
    navigate("/admin/users");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-4">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Modo Suporte: Você está visualizando como {user?.name}</span>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleExitImpersonate}
            className="bg-white text-amber-600 hover:bg-amber-50"
            data-testid="exit-impersonate-btn"
          >
            Sair do Modo Suporte
          </Button>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col ${isImpersonating ? 'pt-12' : ''}`}>
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-primary tracking-tight" data-testid="logo">
            RankFlow
          </h1>
          <p className="text-xs text-slate-500 mt-1">Sistema de Gestão</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          {/* Admin Link - Only for SUPER_ADMIN */}
          {isSuperAdmin && !isImpersonating && (
            <>
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin</p>
              </div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                data-testid="nav-admin"
              >
                <Shield className="w-5 h-5" />
                <span>Admin Master</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              {user?.role && user.role !== "USER" && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-1">
                  {user.role}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-slate-600"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className={`md:hidden fixed ${isImpersonating ? 'top-12' : 'top-0'} left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">RankFlow</h1>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden fixed inset-0 z-30 bg-white ${isImpersonating ? 'pt-28' : 'pt-16'}`}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {isSuperAdmin && !isImpersonating && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="w-5 h-5" />
                <span>Admin Master</span>
              </NavLink>
            )}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-slate-600"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isImpersonating ? 'md:pt-12 pt-28' : 'md:pt-0 pt-16'}`}>
        <Outlet />
      </main>
    </div>
  );
}
