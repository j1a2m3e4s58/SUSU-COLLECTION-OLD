import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, HandCoins, Users, Receipt, BarChart3,
  UserCog, Building2, ScrollText, UserCircle, Contact, SlidersHorizontal
} from 'lucide-react';
import { getSystemHealth } from '@/api/portalClient';

export const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Field Collection', path: '/field-collection', icon: HandCoins, agentOnly: true },
  { label: 'Customers', path: '/customers', icon: Users, customerManagerOnly: true },
  { label: 'Users & Access', path: '/directory', icon: Contact },
  { label: 'Transactions', path: '/transactions', icon: Receipt },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Agent Operations', path: '/agents', icon: UserCog, agentManagerOnly: true },
  { label: 'Branches', path: '/branches', icon: Building2, managerOnly: true },
  { label: 'Portal Control', path: '/portal-control', icon: SlidersHorizontal, ownerOnly: true },
  { label: 'Audit Log', path: '/audit-log', icon: ScrollText, managerOnly: true },
  { label: 'Profile', path: '/profile', icon: UserCircle },
];

export default function Sidebar({ isOpen, onClose, user, settings }) {
  const location = useLocation();
  const [systemOnline, setSystemOnline] = useState(null);

  const canManagePortal = user?.role === 'OwnerAdmin';
  const canOwnerControl = user?.role === 'OwnerAdmin';
  const canSupervise =
    canManagePortal ||
    (user?.role === 'Supervisor' && Array.isArray(user?.managedBranches) && user.managedBranches.length > 0);
  const isSusuAgent = String(user?.department || '').trim().toUpperCase() === 'SUSU AGENT';
  const canManageCustomers = user?.role === 'OwnerAdmin' || user?.role === 'Supervisor';
  const canManageAgents = canManageCustomers;

  const labelFor = (item) => {
    if (item.path === '/') return settings?.dashboardLabel || item.label;
    if (item.path === '/profile') return settings?.profileLabel || item.label;
    return item.label;
  };

  useEffect(() => {
    let mounted = true;
    const check = () => getSystemHealth()
      .then((online) => mounted && setSystemOnline(online))
      .catch(() => mounted && setSystemOnline(false));
    check();
    const interval = window.setInterval(check, 30000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 z-50 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" onClick={onClose} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <HandCoins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-sm leading-tight">{settings?.shortBankName || 'Susu Collection'}</h1>
              <p className="text-[11px] text-muted-foreground">{settings?.portalName || 'SUSU Collection Portal'}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.filter((item) => {
            if (item.managerOnly && !canManagePortal) return false;
            if (item.agentManagerOnly && !canManageAgents) return false;
            if (item.ownerOnly && !canOwnerControl) return false;
            if (item.customerManagerOnly && !canManageCustomers) return false;
            if (item.supervisorOnly && !canSupervise) return false;
            if (item.agentOnly && !isSusuAgent) return false;
            return true;
          }).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {labelFor(item)}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2">
            <div className={`h-2 w-2 rounded-full ${systemOnline === true ? 'bg-emerald-500' : systemOnline === false ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="text-xs text-muted-foreground">
              {systemOnline === true ? 'System Online' : systemOnline === false ? 'System Offline' : 'Checking System'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
