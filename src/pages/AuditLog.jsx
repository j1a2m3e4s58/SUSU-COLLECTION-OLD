import React, { useEffect, useMemo, useState } from 'react';
import { getAuditLogs } from '@/api/portalClient';
import ControlledSelect from '@/components/ui/controlled-select';
import { exportHtmlPdf } from '@/lib/pdfExport';
import { Download, ScrollText, Search } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    getAuditLogs()
      .then(setLogs)
      .catch((err) => setError(err.message || 'Could not load audit logs.'))
      .finally(() => setLoading(false));
  }, []);

  const actions = useMemo(() => [...new Set(logs.map((item) => item.action))].filter(Boolean), [logs]);
  const filtered = useMemo(() => logs.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || [item.actorName, item.action, item.target, item.ipAddress].join(' ').toLowerCase().includes(q);
    return matchesSearch && (!actionFilter || item.action === actionFilter);
  }), [logs, search, actionFilter]);

  const summarize = (target) => {
    const text = typeof target === 'string' ? target : JSON.stringify(target);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  };

  const exportPdf = () => exportHtmlPdf({
    title: 'Audit Log Report',
    subtitle: 'Append-only trail of staff, customer, collection, and portal changes.',
    filename: 'audit-log-report',
    summary: [{ label: 'Visible Entries', value: filtered.length }],
    columns: ['Date', 'Actor', 'Action', 'Details', 'IP Address'],
    rows: filtered.map((item) => [
      item.timestamp ? new Date(item.timestamp).toLocaleString() : '-',
      item.actorName || 'System',
      String(item.action || '-').replace(/_/g, ' '),
      summarize(item.target),
      item.ipAddress || '-',
    ]),
  });

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Security and accountability</p>
          <h1 className="mt-1 flex items-center gap-2 font-heading text-2xl font-bold text-foreground lg:text-3xl">
            <ScrollText className="h-7 w-7 text-blue-500" /> Audit Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Audit records are append-only and cannot be deleted from the portal.</p>
        </div>
        <button onClick={exportPdf} disabled={!filtered.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr,240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audit records..." className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground" />
        </div>
        <ControlledSelect value={actionFilter} onChange={setActionFilter} options={actions.map((value) => ({ value, label: value.replace(/_/g, ' ') }))} placeholder="All actions" className="min-h-11 rounded-lg border-border bg-background" />
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-muted/80"><tr>
            {['Date', 'Actor', 'Action', 'Details', 'IP Address'].map((heading) => <th key={heading} className="px-3 py-3 text-xs font-medium uppercase text-muted-foreground">{heading}</th>)}
          </tr></thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan="5" className="p-3"><div className="h-8 animate-pulse rounded bg-muted/40" /></td></tr>) : filtered.map((item) => (
              <tr key={item.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</td>
                <td className="px-3 py-3 font-medium">{item.actorName || 'System'}</td>
                <td className="px-3 py-3 text-xs">{String(item.action || '-').replace(/_/g, ' ')}</td>
                <td className="max-w-xl px-3 py-3 text-xs text-muted-foreground"><button className="break-words text-left hover:text-foreground" onClick={() => setDetailTarget(item)}>{summarize(item.target)}</button></td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{item.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-muted/30" />) : filtered.map((item) => (
          <button key={item.id} onClick={() => setDetailTarget(item)} className="w-full rounded-xl border border-border bg-card p-4 text-left">
            <div className="flex items-start justify-between gap-3"><span className="text-xs text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</span><span className="text-[11px] font-medium text-blue-500">{String(item.action || '-').replace(/_/g, ' ')}</span></div>
            <p className="mt-2 text-sm font-semibold text-foreground">{item.actorName || 'System'}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{summarize(item.target)}</p>
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 && <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">No audit records found.</div>}
      {!loading && <p className="text-xs text-muted-foreground">{filtered.length} of {logs.length} records</p>}

      {detailTarget && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Close audit details" className="absolute inset-0 bg-black/65" onClick={() => setDetailTarget(null)} /><div className="relative max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-heading text-lg font-bold">Audit Details</h2><p className="text-sm text-muted-foreground">{detailTarget.actorName || 'System'} · {String(detailTarget.action || '-').replace(/_/g, ' ')}</p></div><button className="min-h-11 rounded-lg px-3 text-sm hover:bg-muted" onClick={() => setDetailTarget(null)}>Close</button></div><pre className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-muted/30 p-3 text-xs">{typeof detailTarget.target === 'string' ? detailTarget.target : JSON.stringify(detailTarget.target, null, 2)}</pre></div></div>}
    </div>
  );
}
