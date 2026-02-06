import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings,
  Scan,
  Menu,
  X,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/billing", icon: CreditCard, label: "Billing" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]" data-testid="dashboard-layout">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E4E4E7] flex items-center justify-between px-4 z-40 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#4A6C58] flex items-center justify-center">
            <Scan className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-semibold text-[#1A1A1A]">AI Skin Analysis</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F2F0EB] transition-colors"
          data-testid="mobile-menu-btn"
        >
          {mobileOpen ? (
            <X className="w-5 h-5 text-[#1A1A1A]" strokeWidth={1.5} />
          ) : (
            <Menu className="w-5 h-5 text-[#1A1A1A]" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile slide-in */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-[#E4E4E7] flex flex-col z-40 w-64 transition-transform duration-300 
          md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-14 md:h-16 flex items-center gap-3 px-5 border-b border-[#E4E4E7]">
          <div className="w-8 h-8 rounded-lg bg-[#4A6C58] flex items-center justify-center flex-shrink-0">
            <Scan className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-[#1A1A1A] tracking-tight whitespace-nowrap">
              AI Skin Analysis
            </h1>
            <p className="text-[10px] text-[#A1A1AA] font-medium">Shopify App</p>
          </div>
          {/* Close btn on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F0EB] md:hidden"
          >
            <X className="w-4 h-4 text-[#A1A1AA]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 custom-scrollbar overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {/* Footer Links */}
        <div className="px-4 py-3 border-t border-[#E4E4E7] space-y-2">
          <div className="flex gap-3">
            <NavLink to="/privacy" onClick={() => setMobileOpen(false)} className="text-[10px] text-[#A1A1AA] hover:text-[#4A6C58] transition-colors" data-testid="privacy-link">
              Privacy Policy
            </NavLink>
            <NavLink to="/terms" onClick={() => setMobileOpen(false)} className="text-[10px] text-[#A1A1AA] hover:text-[#4A6C58] transition-colors" data-testid="terms-link">
              Terms of Service
            </NavLink>
          </div>
          <a
            href="mailto:support@inovation.app"
            className="flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-[#4A6C58] transition-colors"
            data-testid="support-email-link"
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            <span>support@inovation.app</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0">
        <div className="p-4 sm:p-6 md:p-10 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
