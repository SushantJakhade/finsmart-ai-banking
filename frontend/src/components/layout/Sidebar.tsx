import { NavLink, useLocation } from "react-router-dom";
import {
  Shield,
  MessageSquareText,
  TrendingUp,
  Bot,
  FileText,
  X,
  LayoutDashboard,
  BarChart3,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/fraud-detection", label: "Fraud Detection", icon: Shield },
  { path: "/loan-prediction", label: "Loan Default Prediction", icon: Landmark },
  { path: "/model-comparison", label: "Model Comparison", icon: BarChart3 },
  { path: "/sentiment-crm", label: "Sentiment Analysis CRM", icon: MessageSquareText },
  { path: "/chatbot", label: "AI Chatbot Assistant", icon: Bot },
  { path: "/regulation-monitor", label: "Regulation NLP Monitor", icon: FileText },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "var(--gradient-sidebar)" }}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-sidebar-foreground">Banking Suite</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sidebar-foreground" />
          </button>
        </div>

        {/* Logo for desktop */}
        <div className="hidden lg:flex items-center gap-3 p-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg">
            <span className="text-sidebar-primary-foreground font-bold">AI</span>
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">Banking Suite</h2>
            <p className="text-xs text-sidebar-foreground/60">Intelligence Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "nav-item",
                  isActive && "active"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-2">
            <p className="text-xs text-sidebar-foreground/50">Version 2.5.0</p>
            <p className="text-xs text-sidebar-foreground/50">© 2024 AI Banking Corp</p>
          </div>
        </div>
      </aside>
    </>
  );
}
