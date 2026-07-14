import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Customers from '@/pages/Customers';
import InactiveCustomers from '@/pages/InactiveCustomers';
import { UserCheck, UserX } from 'lucide-react';

export default function CustomersHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname === '/inactive-customers' || new URLSearchParams(location.search).get('tab') === 'inactive' ? 'inactive' : 'active';
  const selectTab = (nextTab) => navigate(nextTab === 'active' ? '/customers' : '/customers?tab=inactive', { replace: true });
  return (
    <div className="space-y-5">
      <nav aria-label="Customer sections" className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2 sm:flex">
        <button type="button" onClick={() => selectTab('active')} className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-xs font-medium sm:px-4 sm:text-sm ${tab === 'active' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}><UserCheck className="h-4 w-4 shrink-0" /> <span className="truncate">Active Customers</span></button>
        <button type="button" onClick={() => selectTab('inactive')} className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-xs font-medium sm:px-4 sm:text-sm ${tab === 'inactive' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}><UserX className="h-4 w-4 shrink-0" /> Inactive</button>
      </nav>
      {tab === 'active' ? <Customers /> : <InactiveCustomers />}
    </div>
  );
}
