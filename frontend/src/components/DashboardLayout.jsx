import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings,
  Webhook,
  Palette,
  Scan,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/billing", icon: CreditCard, label: "Billing" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/webhooks", icon: Webhook, label: "Webhooks" },
  { path: "/theme-setup", icon: Palette, label: "Theme Setup" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]" data-testid="dashboard-layout">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-[#E4E4E7] flex flex-col z-30 transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[#E4E4E7]">
          <div className="w-8 h-8 rounded-lg bg-[#4A6C58] flex items-center justify-center flex-shrink-0">
            <Scan className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-[#1A1A1A] tracking-tight whitespace-nowrap">
                AI Skin Analysis
              </h1>
              <p className="text-[10px] text-[#A1A1AA] font-medium">Shopify App</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 custom-scrollbar overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 flex items-center justify-center border-t border-[#E4E4E7] text-[#A1A1AA] hover:text-[#1A1A1A] transition-colors"
          data-testid="sidebar-toggle"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "ml-[68px]" : "ml-64"
        }`}
      >
        <div className="p-8 md:p-10 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
