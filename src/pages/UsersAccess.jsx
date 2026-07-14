import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Directory from '@/pages/Directory';
import SupervisorManagement from '@/pages/SupervisorManagement';
import PastStaff from '@/pages/PastStaff';
import { Archive, ShieldCheck, Users } from 'lucide-react';

export default function UsersAccess() {
  const { user } = useAuth();
  const owner = user?.role === 'OwnerAdmin';
  const location = useLocation();
  const navigate = useNavigate();
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const tab = owner && ['supervisors', 'archived'].includes(requestedTab) ? requestedTab : 'active';
  const selectTab = (nextTab) => navigate(nextTab === 'active' ? '/directory' : `/directory?tab=${nextTab}`, { replace: true });
  const tabs = [
    { id: 'active', label: 'Active Users', icon: Users },
    ...(owner ? [{ id: 'supervisors', label: 'Supervisors', icon: ShieldCheck }] : []),
    ...(owner ? [{ id: 'archived', label: 'Archived', icon: Archive }] : []),
  ];

  return (
    <div className="space-y-5">
      <nav aria-label="User management sections" className="flex max-w-full gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => selectTab(item.id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium ${tab === item.id ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </nav>
      {tab === 'active' && <Directory />}
      {tab === 'supervisors' && owner && <SupervisorManagement />}
      {tab === 'archived' && owner && <PastStaff />}
    </div>
  );
}
