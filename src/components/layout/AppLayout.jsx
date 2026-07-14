import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { WorkDateProvider } from '@/lib/WorkDateContext';
import { AgentScopeProvider } from '@/lib/AgentScopeContext';
import Sidebar, { navItems } from './Sidebar';
import Header from './Header';
import AgentScopePanel from '@/components/agents/AgentScopePanel';
import { MoreHorizontal, X } from 'lucide-react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, portalSettings } = useAuth();
  const location = useLocation();
  const isSusuAgent = String(user?.department || '').trim().toUpperCase() === 'SUSU AGENT';
  const canManageCustomers = user?.role === 'OwnerAdmin' || user?.role === 'Supervisor';
  const isOwner = user?.role === 'OwnerAdmin';
  const mobileNavPaths = isSusuAgent
    ? ['/', '/field-collection', '/transactions', '/reports']
    : ['/', '/customers', '/transactions', '/reports'];
  const isAccessible = (item) => {
    if (item.managerOnly && !isOwner) return false;
    if (item.ownerOnly && !isOwner) return false;
    if (item.agentManagerOnly && !canManageCustomers) return false;
    if (item.customerManagerOnly && !canManageCustomers) return false;
    if (item.agentOnly && !isSusuAgent) return false;
    return true;
  };
  const bottomItems = navItems.filter((item) =>
    mobileNavPaths.includes(item.path) &&
    isAccessible(item)
  );
  const moreItems = navItems.filter((item) => !mobileNavPaths.includes(item.path) && isAccessible(item));
  const bottomGridClass = bottomItems.length === 4 ? 'grid-cols-5' : 'grid-cols-4';
  const shortMobileLabel = (label) =>
    label
      .replace('Field Collection', 'Collect')
      .replace('Transactions', 'Activity')
      .replace('Dashboard', 'Home')
      .replace('Agents', 'Agents');

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} settings={portalSettings} />
      <div className="flex-1 flex flex-col min-w-0">
        <WorkDateProvider>
          <AgentScopeProvider>
            <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
            <main className="flex-1 p-4 pb-24 lg:p-6 max-w-full overflow-x-hidden">
              <div className="mx-auto w-full max-w-[1600px] space-y-5">
                <AgentScopePanel />
                <Outlet />
              </div>
            </main>
          </AgentScopeProvider>
        </WorkDateProvider>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pt-2 shadow-2xl backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div className={`grid ${bottomGridClass} gap-1`}>
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full">{shortMobileLabel(item.label)}</span>
                </Link>
              );
            })}
            <button type="button" onClick={() => setMoreOpen(true)} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium ${moreOpen ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
              <MoreHorizontal className="h-5 w-5" /> More
            </button>
          </div>
        </nav>
        {moreOpen && <div className="fixed inset-0 z-[60] lg:hidden"><button aria-label="Close more navigation" className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} /><section className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-lg font-bold">More</h2><button aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted" onClick={() => setMoreOpen(false)}><X className="h-5 w-5" /></button></div><div className="grid grid-cols-2 gap-2">{moreItems.map((item) => { const Icon = item.icon; return <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)} className="flex min-h-14 items-center gap-3 rounded-xl border border-border p-3 text-sm font-medium hover:bg-muted"><Icon className="h-5 w-5 text-blue-500" />{item.label}</Link>; })}</div></section></div>}
      </div>
    </div>
  );
}
