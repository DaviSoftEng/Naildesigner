import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';
import {
  getAppointments, createAppointment, updateAppointmentStatus, updateAppointment, deleteAppointment,
  getStats, getClients,
  getAllServices, createService, updateService, uploadServiceImage,
  getAllGallery, createGalleryPhoto, updateGalleryPhoto, deleteGalleryPhoto, uploadGalleryImage,
  getRecurringBlocks, createRecurringBlock, deleteRecurringBlock,
  getBusinessHours, updateBusinessHours, getDayBlocks, createDayBlock, deleteDayBlock,
  getBookingSettings, updateBookingSettings,
  mediaUrl,
} from '../services/api';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const CATEGORY_LABEL = { unhas: 'Unhas', sobrancelhas: 'Sobrancelhas' };
const STATUS_CONFIG = {
  confirmed: { label: 'Confirmado',     color: 'text-rose-dark',    bg: 'bg-blush/60 border-rose/25' },
  completed: { label: 'Concluído',      color: 'text-emerald-400',  bg: 'bg-emerald-900/30 border-emerald-800/50' },
  no_show:   { label: 'Não compareceu', color: 'text-amber-400',    bg: 'bg-amber-900/25 border-amber-800/40' },
  cancelled: { label: 'Cancelado',      color: 'text-cocoa-light',  bg: 'bg-petal border-linen' },
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function apptServiceNames(a) {
  return a.services?.map((as) => as.service?.name).filter(Boolean).join(' + ') || '—';
}
function fmt(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}
function toMin(t) {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
}
function addMin(t, mins) {
  const tot = toMin(t) + (mins || 0);
  const h = Math.floor(tot / 60) % 24;
  const m = tot % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function durLabel(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
}
function waLink(phone) {
  const d = (phone || '').replace(/\D/g, '');
  const full = d.startsWith('55') ? d : `55${d}`;
  return `https://wa.me/${full}`;
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function nowTimeBR() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false, timeZone: 'America/Sao_Paulo' }).slice(0, 5);
}
function getWeekDates(base) {
  const d = new Date(base + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return ymd(dd);
  });
}
function greeting() {
  const h = parseInt(nowTimeBR().split(':')[0], 10);
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* ─── Ícones do menu ─────────────────────────────────────────────────────── */
const Icon = {
  dashboard: (c) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="13.5" y="3.5" width="7" height="5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="2" /><rect x="3.5" y="15.5" width="7" height="5" rx="2" />
    </svg>
  ),
  agenda: (c) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path strokeLinecap="round" d="M3.5 9.5h17M8 2.8v4M16 2.8v4" />
      <path strokeLinecap="round" d="M8 14h3" />
    </svg>
  ),
  clientes: (c) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8.5" r="3.2" /><path strokeLinecap="round" d="M3.5 19.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <circle cx="16.8" cy="9.5" r="2.4" /><path strokeLinecap="round" d="M16.5 14.6c2 .3 3.5 1.6 4 4" />
    </svg>
  ),
  servicos: (c) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l1.7 4.6 4.8.3-3.7 3.1 1.2 4.7L12 13.6l-4 2.6 1.2-4.7-3.7-3.1 4.8-.3z" />
      <path strokeLinecap="round" d="M19 16.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
    </svg>
  ),
  galeria: (c) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 18.5l4.5-4.5 3 3 3.5-3.5 3.5 3.5" />
    </svg>
  ),
  config: (c) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.5h4l.4-2.5a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z" />
    </svg>
  ),
};

const SECTIONS = [
  { key: 'dashboard', label: 'Início',        icon: Icon.dashboard },
  { key: 'agenda',    label: 'Agenda',        icon: Icon.agenda },
  { key: 'clientes',  label: 'Clientes',      icon: Icon.clientes },
  { key: 'servicos',  label: 'Serviços',      icon: Icon.servicos },
  { key: 'galeria',   label: 'Galeria',       icon: Icon.galeria },
  { key: 'config',    label: 'Ajustes',       icon: Icon.config },
];

/* ═══════════════════════ SHELL DO PAINEL ═══════════════════════ */
export default function Admin() {
  const { user, signOut } = useAuth();
  const [section, setSection] = useState('dashboard');
  const [quickOpen, setQuickOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const bump = () => setReloadKey((k) => k + 1);
  const firstName = user?.name?.split(' ')[0] || 'Bella';

  return (
    <div className="min-h-screen bg-cream lg:pl-60">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-petal border-r border-linen z-30">
        <div className="px-5 pt-6 pb-5">
          <img src="/logo-marca.png" alt={BRAND.fullName} className="h-14 w-auto rounded-xl" />
          <p className="text-cocoa-light text-[11px] font-light mt-2 px-1">Painel de gestão</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {SECTIONS.map((s) => {
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all ${
                  active ? 'bg-rose text-cream font-medium shadow-[0_4px_16px_rgba(199,126,138,0.35)]' : 'text-cocoa-light hover:text-cocoa-dark hover:bg-blush/60'
                }`}
              >
                {s.icon('w-[18px] h-[18px] shrink-0')}
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button onClick={() => setQuickOpen(true)} className="btn-primary w-full py-2.5 text-sm mb-3">
            + Encaixe rápido
          </button>
          <div className="flex items-center justify-between px-3 py-3 rounded-2xl bg-white border border-linen">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-rose flex items-center justify-center text-cream text-sm font-serif shrink-0">
                {firstName[0]}
              </div>
              <p className="text-cocoa-dark text-sm font-medium truncate">{user?.name}</p>
            </div>
            <button onClick={signOut} className="text-cocoa-light hover:text-rose-dark text-xs shrink-0 ml-2 transition-colors">Sair</button>
          </div>
          <a href="/" className="block text-center text-cocoa-light/70 hover:text-cocoa-light text-[11px] mt-3 transition-colors">← Ver o site</a>
        </div>
      </aside>

      {/* ── Header (mobile) ── */}
      <header className="lg:hidden sticky top-0 z-30 bg-cream/95 backdrop-blur-xl border-b border-linen px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-rose flex items-center justify-center text-cream font-serif">
            {firstName[0]}
          </div>
          <div>
            <p className="text-cocoa-dark text-sm font-medium leading-tight">{greeting()}, {firstName}</p>
            <p className="text-cocoa-light text-[11px] font-light capitalize">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setQuickOpen(true)} className="btn-primary px-3.5 py-2 text-xs">+ Encaixe</button>
          <button onClick={signOut} className="text-cocoa-light hover:text-rose-dark text-xs transition-colors">Sair</button>
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="px-5 sm:px-8 py-6 lg:py-8 max-w-5xl mx-auto pb-28 lg:pb-10">
        {section === 'dashboard' && <SectionDashboard key={`d${reloadKey}`} firstName={firstName} onQuick={() => setQuickOpen(true)} goAgenda={() => setSection('agenda')} />}
        {section === 'agenda'    && <SectionAgenda key={`a${reloadKey}`} />}
        {section === 'clientes'  && <SectionClientes />}
        {section === 'servicos'  && <SectionServicos />}
        {section === 'galeria'   && <SectionGaleria />}
        {section === 'config'    && <SectionConfig />}
      </main>

      {/* ── Navegação inferior (mobile) ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-petal/95 backdrop-blur-xl border-t border-linen px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <div className="flex justify-around">
          {SECTIONS.map((s) => {
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all ${active ? 'text-rose-dark' : 'text-cocoa-light/70'}`}
              >
                {s.icon(`w-[22px] h-[22px] ${active ? 'drop-shadow-[0_0_8px_rgba(224,160,172,0.6)]' : ''}`)}
                <span className={`text-[10px] ${active ? 'font-medium' : 'font-light'}`}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Encaixe rápido ── */}
      {quickOpen && (
        <QuickBookingModal onClose={() => setQuickOpen(false)} onSaved={() => { setQuickOpen(false); bump(); }} />
      )}
    </div>
  );
}

/* ═══════════════════════ DASHBOARD ═══════════════════════ */
function SectionDashboard({ firstName, onQuick, goAgenda }) {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = todayBR();

  useEffect(() => {
    Promise.all([getStats(), getAppointments()])
      .then(([s, a]) => { setStats(s.data); setAppointments(a.data); })
      .catch(() => setError('Erro ao carregar dados. Verifique a conexão com o servidor.'))
      .finally(() => setLoading(false));
  }, []);

  const todayAppts = useMemo(
    () => appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  // Próxima cliente: primeiro confirmado de hoje que ainda não terminou
  const now = nowTimeBR();
  const nextClient = todayAppts.find((a) => a.status === 'confirmed' && addMin(a.time, a.totalDuration || 0) > now);

  // Faturamento dos últimos 7 dias (concluídos)
  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() - (6 - i));
      return ymd(d);
    });
    const totals = days.map((d) =>
      Math.round(appointments
        .filter((a) => a.date === d && a.status === 'completed')
        .reduce((s, a) => s + a.price, 0) * 100) / 100
    );
    return { days, totals, max: Math.max(...totals, 1) };
  }, [appointments, today]);

  if (loading) return <Spinner />;
  if (error) return <div className="card p-6 text-rose-dark text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Saudação (desktop — no mobile já está no header) */}
      <div className="hidden lg:flex items-end justify-between">
        <div>
          <p className="text-cocoa-light text-sm capitalize font-light">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <h1 className="text-3xl text-cocoa-dark mt-1">{greeting()}, <em className="text-rose italic">{firstName}</em> 💅</h1>
        </div>
        <button onClick={onQuick} className="btn-primary px-5 py-2.5 text-sm">+ Encaixe rápido</button>
      </div>

      {/* Próxima cliente */}
      {nextClient ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose to-rose-dark p-6 shadow-[0_10px_40px_rgba(199,126,138,0.30)]">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-cream/80 text-xs uppercase tracking-[0.2em] mb-2">Próxima cliente</p>
              <p className="text-cream font-serif text-3xl">{nextClient.time} <span className="text-cream/70 text-lg">· {nextClient.clientName}</span></p>
              <p className="text-cream/80 text-sm mt-1.5 font-light">{apptServiceNames(nextClient)}</p>
              <p className="text-cream/70 text-xs mt-1 font-light">{durLabel(nextClient.totalDuration)} · {fmtCurrency(nextClient.price)} · até {addMin(nextClient.time, nextClient.totalDuration || 0)}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <a
                href={`${waLink(nextClient.clientPhone)}?text=${encodeURIComponent(`Olá ${nextClient.clientName}! 💕 Te espero hoje às ${nextClient.time} para ${apptServiceNames(nextClient)}. Até já!`)}`}
                target="_blank" rel="noreferrer"
                className="bg-cream text-rose-dark hover:bg-white rounded-full px-5 py-2.5 text-sm font-medium text-center transition-colors"
              >
                Chamar no WhatsApp
              </a>
              <button onClick={goAgenda} className="border border-cream/40 text-cream hover:bg-white/10 rounded-full px-5 py-2.5 text-sm transition-colors">
                Ver agenda
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-cocoa-dark font-medium">Sem próximas clientes hoje 🌙</p>
            <p className="text-cocoa-light text-sm font-light mt-0.5">Aproveite para atualizar o portfólio ou conferir a semana.</p>
          </div>
          <button onClick={goAgenda} className="btn-outline px-5 py-2 text-sm">Ver agenda</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Hoje"             value={`${stats?.today.confirmed ?? 0} + ${stats?.today.completed ?? 0}`} sub="confirmados + concluídos" color="rose" />
        <KpiCard title="Faturado hoje"    value={fmtCurrency(stats?.today.revenue)} sub="em concluídos" color="green" />
        <KpiCard title="Faturado no mês"  value={fmtCurrency(stats?.month.revenue)} sub={`${stats?.month.total} atendimentos`} color="rose" />
        <KpiCard title="Ticket médio"     value={stats?.month.total ? fmtCurrency(stats.month.revenue / stats.month.total) : 'R$ 0,00'} sub="no mês" color="plain" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Gráfico 7 dias */}
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="text-cocoa-dark text-sm font-medium">Faturamento · últimos 7 dias</h3>
            <span className="text-rose-dark font-serif">{fmtCurrency(chart.totals.reduce((s, v) => s + v, 0))}</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {chart.days.map((d, i) => {
              const v = chart.totals[i];
              const pct = Math.max((v / chart.max) * 100, 3);
              const isToday = d === today;
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1.5 group" title={`${fmt(d)} — ${fmtCurrency(v)}`}>
                  <span className="text-[10px] text-cocoa-light/0 group-hover:text-cocoa-light transition-colors font-light">
                    {v > 0 ? fmtCurrency(v).replace(',00', '') : ''}
                  </span>
                  <div className="w-full max-w-[34px] rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${pct}%`,
                      background: v > 0
                        ? (isToday ? 'linear-gradient(to top, #C77E8A, #E0A0AC)' : 'linear-gradient(to top, #4A3531, #C77E8A)')
                        : '#3C2A28',
                    }}
                  />
                  <span className={`text-[10px] ${isToday ? 'text-rose-dark font-medium' : 'text-cocoa-light/70 font-light'}`}>
                    {DAYS[new Date(d + 'T12:00:00').getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Serviços mais pedidos */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-cocoa-dark text-sm font-medium mb-4">Mais pedidos</h3>
          {(!stats?.topServices || stats.topServices.length === 0) && <p className="text-cocoa-light text-sm font-light">Nenhum dado ainda.</p>}
          <div className="space-y-3">
            {stats?.topServices?.map((s, i) => (
              <div key={s.serviceId} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-serif shrink-0 ${i === 0 ? 'bg-rose text-cream' : 'bg-blush text-rose-dark'}`}>{i + 1}</span>
                <span className="text-cocoa text-sm flex-1 truncate">{s.name}</span>
                <span className="text-cocoa-dark text-sm font-medium shrink-0">{s.count}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agenda de hoje */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cocoa-dark text-sm font-medium">Agenda de hoje</h3>
          <button onClick={goAgenda} className="text-rose hover:text-rose-dark text-xs transition-colors">Ver completa →</button>
        </div>
        {todayAppts.length === 0 && <p className="text-cocoa-light text-sm font-light">Nenhum agendamento hoje.</p>}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {todayAppts.map((a) => (
            <div key={a.id} className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border ${STATUS_CONFIG[a.status]?.bg}`}>
              <div className="min-w-0">
                <p className="text-cocoa-dark text-sm font-medium truncate">{a.time} · {a.clientName}</p>
                <p className="text-cocoa-light text-xs font-light truncate">{apptServiceNames(a)}</p>
              </div>
              <span className={`text-xs shrink-0 ml-3 ${STATUS_CONFIG[a.status]?.color}`}>{STATUS_CONFIG[a.status]?.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ ENCAIXE RÁPIDO ═══════════════════════ */
function QuickBookingModal({ onClose, onSaved }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ clientName: '', clientPhone: '', date: todayBR(), time: '', notes: '', serviceIds: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllServices().then((r) => setServices(r.data.filter((s) => s.active))).catch(() => {});
  }, []);

  const toggleSvc = (id) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));

  const selected = services.filter((s) => form.serviceIds.includes(s.id));
  const totalDur = selected.reduce((t, s) => t + s.duration, 0);
  const totalPrice = selected.reduce((t, s) => t + s.price, 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.serviceIds.length === 0) { setError('Selecione ao menos um serviço'); return; }
    setSaving(true); setError('');
    try {
      await createAppointment({
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        serviceIds: form.serviceIds,
        date: form.date,
        time: form.time,
        notes: form.notes,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar o encaixe');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4" onClick={onClose}>
      <div className="bg-cream border border-linen rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-linen flex items-center justify-between sticky top-0 bg-cream z-10">
          <div>
            <h3 className="text-cocoa-dark font-medium text-sm">Encaixe rápido</h3>
            <p className="text-cocoa-light text-xs font-light">Marque uma cliente direto pelo painel</p>
          </div>
          <button onClick={onClose} className="text-cocoa-light hover:text-cocoa-dark text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Nome</label>
              <input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="Maria Silva" className="input-field" required />
            </div>
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Telefone</label>
              <input type="tel" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} placeholder="(21) 99999-9999" className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Horário</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="input-field" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-cocoa-light text-xs">Serviços</label>
              {selected.length > 0 && <span className="text-cocoa-light text-xs font-light">{durLabel(totalDur)} · {fmtCurrency(totalPrice)}</span>}
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {services.map((s) => {
                const checked = form.serviceIds.includes(s.id);
                return (
                  <label key={s.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border cursor-pointer transition-all ${
                      checked ? 'bg-blush/70 border-rose/40' : 'bg-white border-linen hover:border-rose/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-rose bg-rose' : 'border-linen'}`}>
                        {checked && <div className="w-2 h-1.5 bg-cream rounded-sm" />}
                      </div>
                      <div>
                        <p className={`text-sm ${checked ? 'text-rose-dark' : 'text-cocoa-dark'}`}>{s.name}</p>
                        <p className="text-cocoa-light text-xs font-light">{durLabel(s.duration)}</p>
                      </div>
                    </div>
                    <span className="text-cocoa-light text-sm shrink-0 ml-3">{fmtCurrency(s.price)}</span>
                    <input type="checkbox" className="hidden" checked={checked} readOnly onClick={() => toggleSvc(s.id)} />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-cocoa-light text-xs block mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input-field resize-none" placeholder="Opcional..." />
          </div>

          {error && (
            <div className="bg-rose/5 border border-rose/30 rounded-2xl px-3 py-2">
              <p className="text-rose-dark text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-white border border-linen text-cocoa-light py-2.5 rounded-full text-sm hover:text-cocoa-dark transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Confirmar encaixe'}
            </button>
          </div>
          <p className="text-cocoa-light/60 text-[11px] font-light">O sistema confere conflitos de horário automaticamente antes de salvar.</p>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════ AGENDA ═══════════════════════ */
function SectionAgenda() {
  const today = todayBR();
  const [weekBase, setWeekBase] = useState(today);
  const [weekDates, setWeekDates] = useState(getWeekDates(today));
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState('day');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getAppointments().then((r) => setAppointments(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setWeekDates(getWeekDates(weekBase)); }, [weekBase]);

  const shiftWeek = (dir) => {
    const d = new Date(weekBase + 'T12:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekBase(ymd(d));
  };

  const apptsByDate = {};
  appointments.forEach((a) => {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    apptsByDate[a.date].push(a);
  });

  const handleStatusChange = async (id, status) => {
    await updateAppointmentStatus(id, status);
    load();
  };
  const handleDelete = async (id) => {
    if (!confirm('Excluir este agendamento permanentemente?')) return;
    await deleteAppointment(id);
    load();
  };

  const dayAppts = (apptsByDate[selectedDate] || []).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-cocoa-dark">Agenda</h2>
        <div className="flex gap-2">
          <button onClick={() => setView('day')} className={`px-4 py-1.5 rounded-full text-xs transition-all ${view === 'day' ? 'bg-rose text-cream' : 'bg-white text-cocoa-light border border-linen'}`}>Dia</button>
          <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-full text-xs transition-all ${view === 'week' ? 'bg-rose text-cream' : 'bg-white text-cocoa-light border border-linen'}`}>Semana</button>
        </div>
      </div>

      {/* Week strip */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftWeek(-1)} className="text-cocoa-light hover:text-cocoa-dark text-xl px-2">‹</button>
          <button onClick={() => { setWeekBase(today); setSelectedDate(today); }} className="text-cocoa-light hover:text-rose-dark text-xs font-light transition-colors">
            {fmt(weekDates[0])} — {fmt(weekDates[6])} · hoje
          </button>
          <button onClick={() => shiftWeek(1)} className="text-cocoa-light hover:text-cocoa-dark text-xl px-2">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => {
            const count = apptsByDate[date]?.filter((a) => a.status !== 'cancelled').length || 0;
            const isToday = date === today;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setView('day'); }}
                className={`flex flex-col items-center py-2 px-1 rounded-2xl transition-all ${
                  isSelected ? 'bg-rose' : isToday ? 'bg-blush border border-rose/30' : 'hover:bg-petal'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'text-cream/80' : 'text-cocoa-light'}`}>{DAYS[i]}</span>
                <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-cream' : isToday ? 'text-rose-dark' : 'text-cocoa'}`}>
                  {new Date(date + 'T12:00:00').getDate()}
                </span>
                {count > 0 && (
                  <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-cream/90' : 'text-rose'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'week'
        ? <WeekView weekDates={weekDates} apptsByDate={apptsByDate} />
        : <DayView date={selectedDate} appointments={dayAppts} loading={loading} onStatusChange={handleStatusChange} onDelete={handleDelete} onReload={load} />
      }
    </div>
  );
}

function WeekView({ weekDates, apptsByDate }) {
  return (
    <div className="-mx-5 px-5 overflow-x-auto sm:mx-0 sm:px-0 sm:overflow-visible no-scrollbar">
      <div className="grid grid-cols-7 gap-2 min-w-[620px] sm:min-w-0">
        {weekDates.map((date, i) => {
          const appts = (apptsByDate[date] || []).filter((a) => a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={date} className="card p-2 min-h-24">
              <p className="text-cocoa-light text-xs text-center">{DAYS[i]}</p>
              <p className="text-cocoa text-xs text-center mb-2">{new Date(date + 'T12:00:00').getDate()}</p>
              <div className="space-y-1">
                {appts.map((a) => (
                  <div key={a.id} className={`px-1.5 py-1 rounded-lg text-[10px] border ${STATUS_CONFIG[a.status]?.bg}`}>
                    <p className="text-cocoa-dark font-medium">{a.time}</p>
                    <p className="text-cocoa-light truncate font-light">{a.clientName}</p>
                  </div>
                ))}
                {appts.length === 0 && <p className="text-linen text-[10px] text-center mt-2">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ date, appointments, loading, onStatusChange, onDelete, onReload }) {
  const [editingAppt, setEditingAppt] = useState(null);
  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  if (loading) return <Spinner />;

  const active = appointments.filter((a) => a.status !== 'cancelled');
  const cancelled = appointments.filter((a) => a.status === 'cancelled');

  const revenue = active
    .filter((a) => a.status === 'confirmed' || a.status === 'completed')
    .reduce((s, a) => s + a.price, 0);

  return (
    <div className="space-y-4">
      <p className="text-cocoa-light text-sm capitalize font-light">{dateLabel}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Clientes"    value={active.length} />
        <MiniStat label="Confirmados" value={active.filter((a) => a.status === 'confirmed').length} color="rose" />
        <MiniStat label="Concluídos"  value={active.filter((a) => a.status === 'completed').length} color="green" />
        <MiniStat label="Previsto"    value={fmtCurrency(revenue)} color="rose" />
      </div>

      {appointments.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-cocoa-light text-sm font-light">Nenhum agendamento neste dia.</p>
        </div>
      )}

      <div className="space-y-2">
        {active.map((a, idx) => {
          const prev = active[idx - 1];
          const prevEnd = prev ? addMin(prev.time, prev.totalDuration || 0) : null;
          const gapMin = prev ? toMin(a.time) - toMin(prevEnd) : 0;
          return (
            <Fragment key={a.id}>
              {gapMin > 0 && <FreeGap mins={gapMin} from={prevEnd} to={a.time} />}
              <ApptRow a={a} onEdit={() => setEditingAppt(a)} onStatusChange={onStatusChange} onDelete={onDelete} />
            </Fragment>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <div className="pt-2">
          <p className="text-cocoa-light text-xs mb-2">Cancelados ({cancelled.length})</p>
          <div className="space-y-2">
            {cancelled.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2.5 bg-petal border border-linen rounded-2xl">
                <span className="text-cocoa-light text-sm line-through truncate font-light">{a.time} · {a.clientName} · {apptServiceNames(a)}</span>
                <button onClick={() => onDelete(a.id)} className="text-cocoa-light/60 hover:text-rose-dark text-xs ml-3 shrink-0 transition-colors">Excluir</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingAppt && (
        <EditModal
          appointment={editingAppt}
          onClose={() => setEditingAppt(null)}
          onSaved={() => { setEditingAppt(null); onReload(); }}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  const colors = { rose: 'text-rose-dark', green: 'text-emerald-400' };
  return (
    <div className="bg-white border border-linen rounded-2xl px-3 py-2.5">
      <p className="text-cocoa-light text-[11px] font-light">{label}</p>
      <p className={`text-lg font-bold ${colors[color] || 'text-cocoa-dark'}`}>{value}</p>
    </div>
  );
}

function FreeGap({ mins, from, to }) {
  return (
    <div className="flex items-center gap-3 px-1 py-0.5">
      <div className="flex-1 border-t border-dashed border-linen" />
      <span className="text-cocoa-light/60 text-[11px] shrink-0 font-light">livre {durLabel(mins)} · {from}–{to}</span>
      <div className="flex-1 border-t border-dashed border-linen" />
    </div>
  );
}

function ApptRow({ a, onEdit, onStatusChange, onDelete }) {
  const end = addMin(a.time, a.totalDuration || 0);
  const st = STATUS_CONFIG[a.status];
  const waMsg = `Olá ${a.clientName}! 💕 Sobre seu horário no studio: ${apptServiceNames(a)} — ${fmt(a.date)} às ${a.time}. Qualquer dúvida, é só me chamar por aqui. 😊`;
  const waHref = `${waLink(a.clientPhone)}?text=${encodeURIComponent(waMsg)}`;
  return (
    <div className={`card border ${st?.bg} p-4`}>
      <div className="flex gap-4">
        <div className="flex flex-col items-center w-16 shrink-0">
          <span className="text-cocoa-dark text-lg font-bold leading-tight">{a.time}</span>
          <span className="text-cocoa-light text-[11px] font-light">até {end}</span>
          <span className="mt-1 text-[10px] text-cocoa bg-white border border-linen rounded-lg px-1.5 py-0.5">{durLabel(a.totalDuration || 0)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-cocoa-dark font-medium truncate">{a.clientName}</p>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${st?.bg} ${st?.color}`}>{st?.label}</span>
          </div>
          <p className="text-cocoa-light text-sm mt-0.5 font-light">{apptServiceNames(a)}</p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-rose-dark text-sm font-semibold">{fmtCurrency(a.price)}</span>
            <a href={waHref} target="_blank" rel="noreferrer"
              className="text-cocoa-light hover:text-emerald-400 text-xs inline-flex items-center gap-1 transition-colors">
              <WhatsAppIcon /> {a.clientPhone}
            </a>
          </div>

          {a.notes && (
            <p className="text-cocoa text-xs mt-2 bg-white border border-linen rounded-xl px-2.5 py-1.5">📝 {a.notes}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {a.status !== 'completed' && (
              <ActionBtn color="green" onClick={() => onStatusChange(a.id, 'completed')}>Concluído</ActionBtn>
            )}
            {a.status !== 'no_show' && (
              <ActionBtn color="yellow" onClick={() => onStatusChange(a.id, 'no_show')}>Faltou</ActionBtn>
            )}
            {a.status !== 'confirmed' && (
              <ActionBtn color="rose" onClick={() => onStatusChange(a.id, 'confirmed')}>Reabrir</ActionBtn>
            )}
            <ActionBtn color="rose" onClick={onEdit}>Editar</ActionBtn>
            <ActionBtn color="red" onClick={() => onStatusChange(a.id, 'cancelled')}>Cancelar</ActionBtn>
            <button
              onClick={() => onDelete(a.id)}
              className="ml-auto px-3 py-1.5 bg-white border border-linen text-cocoa-light/70 text-xs rounded-full hover:text-rose-dark transition-all"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.738-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

/* ═══════════════════════ CLIENTES ═══════════════════════ */
function SectionClientes() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = (q) => {
    setLoading(true);
    getClients(q).then((r) => setClients(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(''); }, []);

  const handleSearch = (e) => { e.preventDefault(); load(search); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-cocoa-dark">Clientes</h2>
        <span className="text-cocoa-light text-sm font-light">{clients.length} encontradas</span>
      </div>
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="input-field flex-1 min-w-[200px]" />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">Buscar</button>
        <button type="button" onClick={() => { setSearch(''); load(''); }} className="px-4 py-2 bg-white border border-linen text-cocoa-light text-sm rounded-full hover:text-cocoa-dark transition-all">
          Limpar
        </button>
      </form>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div
              key={c.clientPhone}
              className={`card p-4 cursor-pointer transition-all hover:border-rose/40 ${selected === c.clientPhone ? 'border-rose/50' : ''}`}
              onClick={() => setSelected(selected === c.clientPhone ? null : c.clientPhone)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blush text-rose-dark flex items-center justify-center font-serif shrink-0">
                    {c.clientName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-cocoa-dark font-medium truncate">{c.clientName}</p>
                    <p className="text-cocoa-light text-sm font-light">{c.clientPhone}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-rose-dark font-serif">{fmtCurrency(c.totalSpent)}</p>
                  <p className="text-cocoa-light text-xs font-light">{c.totalVisits} visita{c.totalVisits !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {c.lastVisit && <p className="text-cocoa-light/60 text-xs mt-2 font-light">Última: {fmt(c.lastVisit)}</p>}

              {selected === c.clientPhone && (
                <div className="mt-4 border-t border-petal pt-4 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-cocoa-light text-xs">Histórico</p>
                    <a href={waLink(c.clientPhone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      className="text-emerald-400 text-xs inline-flex items-center gap-1 hover:underline">
                      <WhatsAppIcon /> Chamar
                    </a>
                  </div>
                  {c.appointments.slice(0, 8).map((a) => (
                    <div key={a.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm ${STATUS_CONFIG[a.status]?.bg}`}>
                      <span className="text-cocoa text-xs">{fmt(a.date)} {a.time} · {apptServiceNames(a)}</span>
                      <span className={`text-xs ${STATUS_CONFIG[a.status]?.color}`}>{STATUS_CONFIG[a.status]?.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {clients.length === 0 && <p className="text-cocoa-light text-sm col-span-2 font-light">Nenhuma cliente encontrada.</p>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ SERVIÇOS ═══════════════════════ */
function SectionServicos() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', duration: '', description: '', category: 'unhas', image: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const load = () => {
    setLoading(true);
    getAllServices().then((r) => setServices(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const r = await uploadServiceImage(file);
      setForm((f) => ({ ...f, image: r.data.url }));
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Erro ao enviar a imagem');
    } finally { setUploading(false); }
  };

  const openNew = () => { setForm({ name: '', price: '', duration: '', description: '', category: 'unhas', image: '' }); setEditing('new'); };
  const openEdit = (s) => { setForm({ name: s.name, price: s.price, duration: s.duration, description: s.description, category: s.category || 'unhas', image: s.image || '' }); setEditing(s); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing === 'new') await createService(form);
      else await updateService(editing.id, form);
      setEditing(null);
      load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (s) => { await updateService(s.id, { active: !s.active }); load(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-cocoa-dark">Serviços</h2>
        <button onClick={openNew} className="btn-primary px-4 py-2 text-sm">+ Novo serviço</button>
      </div>

      {editing && (
        <div className="card p-5">
          <h3 className="text-cocoa-dark font-medium mb-4">{editing === 'new' ? 'Novo serviço' : `Editar: ${editing.name}`}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-cocoa-light text-xs block mb-1">Nome</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Esmaltação em Gel" className="input-field" required />
            </div>
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Categoria</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field">
                <option value="unhas">Unhas</option>
                <option value="sobrancelhas">Sobrancelhas</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-cocoa-light text-xs block mb-1">Preço (R$)</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" className="input-field" required />
              </div>
              <div>
                <label className="text-cocoa-light text-xs block mb-1">Duração (min)</label>
                <input type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="60" className="input-field" required />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-cocoa-light text-xs block mb-1">Descrição</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição breve do serviço" className="input-field" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-cocoa-light text-xs block mb-1">Foto do serviço (opcional)</label>
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed cursor-pointer transition-all text-sm ${uploading ? 'border-rose/50 text-rose' : 'border-linen text-cocoa-light hover:border-rose/50 hover:text-rose-dark'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                    {uploading ? 'Enviando...' : 'Enviar foto do celular'}
                  </label>
                  <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="ou cole o link de uma imagem" className="input-field" />
                </div>
                {mediaUrl(form.image) && (
                  <img src={mediaUrl(form.image)} alt="" className="w-20 h-20 rounded-2xl object-cover border border-linen shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
              </div>
              {uploadError && <p className="text-rose-dark text-[11px] mt-1">{uploadError}</p>}
              <p className="text-cocoa-light/60 text-[11px] mt-1 font-light">JPG, PNG ou WEBP até 5 MB. Aparece no card do serviço no site.</p>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="px-5 py-2 bg-white border border-linen text-cocoa-light text-sm rounded-full hover:text-cocoa-dark transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className={`card p-4 flex items-center justify-between transition-all ${!s.active ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-4 min-w-0">
                {mediaUrl(s.image)
                  ? <img src={mediaUrl(s.image)} alt="" className="w-14 h-14 rounded-2xl object-cover border border-linen shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  : <div className="w-14 h-14 rounded-2xl bg-petal border border-linen flex items-center justify-center shrink-0 text-cocoa-light/50 text-xs">sem foto</div>
                }
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-cocoa-dark font-medium truncate">{s.name}</p>
                    <span className="text-[10px] text-rose bg-blush rounded-full px-2 py-0.5 shrink-0">{CATEGORY_LABEL[s.category] || s.category}</span>
                    {!s.active && <span className="text-cocoa-light text-[10px] border border-linen px-1.5 py-0.5 rounded-full shrink-0">inativo</span>}
                  </div>
                  <p className="text-cocoa-light text-sm truncate font-light">{s.description}</p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-rose-dark text-sm font-medium">{fmtCurrency(s.price)}</span>
                    <span className="text-cocoa-light text-sm font-light">{durLabel(s.duration)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => openEdit(s)} className="px-3 py-1.5 bg-white border border-linen text-cocoa-light text-xs rounded-full hover:text-cocoa-dark transition-all">Editar</button>
                <button onClick={() => handleToggle(s)} className={`px-3 py-1.5 text-xs rounded-full border transition-all ${s.active ? 'bg-white border-linen text-cocoa-light hover:text-amber-400' : 'bg-emerald-900/30 border-emerald-800/50 text-emerald-400'}`}>
                  {s.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ GALERIA ═══════════════════════ */
function SectionGaleria() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ image: '', caption: '', category: 'unhas' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getAllGallery().then((r) => setPhotos(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const r = await uploadGalleryImage(file);
      setForm((f) => ({ ...f, image: r.data.url }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar a imagem');
    } finally { setUploading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.image) { setError('Envie uma foto ou cole um link primeiro.'); return; }
    setSaving(true);
    setError('');
    try {
      await createGalleryPhoto(form);
      setForm({ image: '', caption: '', category: 'unhas' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar a foto');
    } finally { setSaving(false); }
  };

  const handleToggle = async (p) => { await updateGalleryPhoto(p.id, { active: !p.active }); load(); };
  const handleDelete = async (id) => {
    if (!confirm('Excluir esta foto do portfólio?')) return;
    await deleteGalleryPhoto(id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-cocoa-dark">Galeria</h2>
        <span className="text-cocoa-light text-sm font-light">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-cocoa-light text-sm font-light -mt-2">As fotos ativas aparecem na seção "Portfólio" do site. Mostre seus melhores trabalhos! 💅</p>

      <form onSubmit={handleAdd} className="card p-5 space-y-4">
        <h3 className="text-cocoa-dark font-medium">Adicionar foto</h3>
        <div className="flex gap-3 items-start">
          <div className="flex-1 space-y-2">
            <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed cursor-pointer transition-all text-sm ${uploading ? 'border-rose/50 text-rose' : 'border-linen text-cocoa-light hover:border-rose/50 hover:text-rose-dark'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
              {uploading ? 'Enviando...' : 'Enviar foto do celular'}
            </label>
            <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="ou cole o link de uma imagem" className="input-field" />
          </div>
          {mediaUrl(form.image) && (
            <img src={mediaUrl(form.image)} alt="" className="w-24 h-24 rounded-2xl object-cover border border-linen shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Legenda (opcional)</label>
            <input value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} placeholder="Ex: Francesinha em gel" className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Categoria</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field">
              <option value="unhas">Unhas</option>
              <option value="sobrancelhas">Sobrancelhas</option>
            </select>
          </div>
        </div>
        {error && <p className="text-rose-dark text-sm">{error}</p>}
        <button type="submit" disabled={saving || uploading} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
          {saving ? 'Adicionando...' : 'Adicionar ao portfólio'}
        </button>
      </form>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((p) => (
            <div key={p.id} className={`card overflow-hidden ${!p.active ? 'opacity-40' : ''}`}>
              <div className="aspect-[4/5] bg-petal">
                <img src={mediaUrl(p.image)} alt={p.caption || ''} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div className="p-3">
                <p className="text-cocoa-dark text-xs font-medium truncate">{p.caption || 'Sem legenda'}</p>
                <p className="text-rose text-[10px] mt-0.5">{CATEGORY_LABEL[p.category] || p.category}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleToggle(p)} className="flex-1 px-2 py-1.5 text-[11px] rounded-full border border-linen text-cocoa-light hover:text-cocoa-dark transition-all">
                    {p.active ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="px-2.5 py-1.5 text-[11px] rounded-full border border-rose/30 text-rose-dark hover:bg-rose/5 transition-all">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
          {photos.length === 0 && <p className="text-cocoa-light text-sm col-span-full font-light">Nenhuma foto ainda. Adicione a primeira! 📸</p>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ AJUSTES ═══════════════════════ */
function SectionConfig() {
  const [hours, setHours] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newBlock, setNewBlock] = useState({ date: '', reason: '', startTime: '', endTime: '' });
  const [newRecurring, setNewRecurring] = useState({ clientName: '', dayOfWeek: '2', time: '', duration: '60', notes: '' });
  const [settings, setSettings] = useState({ bookingWindowDays: 14, whatsapp: '', depositPercent: 30, depositPixKey: '', cancelHours: 24 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getBusinessHours(), getDayBlocks(), getRecurringBlocks(), getBookingSettings()])
      .then(([h, b, r, s]) => {
        setHours(h.data); setBlocks(b.data); setRecurring(r.data);
        if (s.data) setSettings((prev) => ({ ...prev, ...s.data }));
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      await updateBookingSettings({
        bookingWindowDays: Number(settings.bookingWindowDays),
        whatsapp: settings.whatsapp,
        depositPercent: Number(settings.depositPercent),
        depositPixKey: settings.depositPixKey,
        cancelHours: Number(settings.cancelHours),
      });
      setSettingsMsg('Salvo! ✓');
      setTimeout(() => setSettingsMsg(''), 2500);
    } catch (e) {
      setSettingsMsg(e.response?.data?.error || 'Erro ao salvar');
    } finally { setSavingSettings(false); }
  };

  const updateHour = (idx, field, value) => setHours((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));

  const saveHours = async () => {
    setSaving(true);
    try { await updateBusinessHours(hours); }
    finally { setSaving(false); }
  };

  const handleAddBlock = async (e) => {
    e.preventDefault();
    await createDayBlock({ date: newBlock.date, reason: newBlock.reason, startTime: newBlock.startTime || null, endTime: newBlock.endTime || null });
    setNewBlock({ date: '', reason: '', startTime: '', endTime: '' });
    load();
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    await createRecurringBlock(newRecurring);
    setNewRecurring({ clientName: '', dayOfWeek: '2', time: '', duration: '60', notes: '' });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl text-cocoa-dark">Ajustes</h2>

      {/* Agendamento, sinal e contato */}
      <section className="card p-5">
        <h3 className="text-cocoa-dark font-medium mb-1">Agendamento & política de sinal</h3>
        <p className="text-cocoa-light text-xs mb-5 font-light">Janela de horários, WhatsApp do studio e a política exibida para as clientes.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Agenda aberta (dias à frente)</label>
            <input type="number" min="1" max="365" value={settings.bookingWindowDays}
              onChange={(e) => setSettings((s) => ({ ...s, bookingWindowDays: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">WhatsApp do studio</label>
            <input type="tel" value={settings.whatsapp}
              onChange={(e) => setSettings((s) => ({ ...s, whatsapp: e.target.value }))} placeholder="(21) 99999-9999" className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Sinal (% do valor) — 0 desativa</label>
            <input type="number" min="0" max="100" value={settings.depositPercent}
              onChange={(e) => setSettings((s) => ({ ...s, depositPercent: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Chave Pix do sinal</label>
            <input value={settings.depositPixKey}
              onChange={(e) => setSettings((s) => ({ ...s, depositPixKey: e.target.value }))} placeholder="CPF, celular ou e-mail" className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Cancelamento sem perder sinal (horas)</label>
            <input type="number" min="0" max="168" value={settings.cancelHours}
              onChange={(e) => setSettings((s) => ({ ...s, cancelHours: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-end gap-3">
            <button onClick={saveSettings} disabled={savingSettings} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
              {savingSettings ? 'Salvando...' : 'Salvar'}
            </button>
            {settingsMsg && <span className="text-emerald-400 text-sm pb-2.5">{settingsMsg}</span>}
          </div>
        </div>
        <p className="text-cocoa-light/60 text-[11px] mt-4 font-light">
          A política aparece na home, no agendamento e na confirmação. O valor do sinal é calculado automaticamente sobre o total dos serviços escolhidos.
        </p>
      </section>

      {/* Horários */}
      <section className="card p-5">
        <h3 className="text-cocoa-dark font-medium mb-1">Horário de funcionamento</h3>
        <p className="text-cocoa-light text-xs mb-5 font-light">Inclui pausa opcional por dia (ex.: almoço). Deixe a pausa vazia para atender direto.</p>
        <div className="space-y-4">
          {hours.map((h, idx) => (
            <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-3">
              <span className="text-cocoa text-sm w-16">{DAYS_FULL[h.dayOfWeek]}</span>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => updateHour(idx, 'isOpen', !h.isOpen)}>
                <div className={`w-9 h-5 rounded-full relative transition-all ${h.isOpen ? 'bg-rose' : 'bg-linen'}`}>
                  <div className="w-3.5 h-3.5 rounded-full bg-cocoa-dark absolute top-0.5 transition-all" style={{ left: h.isOpen ? '18px' : '2px' }} />
                </div>
                <span className="text-cocoa-light text-xs w-14">{h.isOpen ? 'Aberto' : 'Fechado'}</span>
              </label>
              {h.isOpen && (
                <>
                  <div>
                    <label className="text-cocoa-light/70 text-xs block">Abre</label>
                    <input type="time" value={h.openTime} onChange={(e) => updateHour(idx, 'openTime', e.target.value)} className="input-field py-1.5 text-sm w-28" />
                  </div>
                  <div>
                    <label className="text-cocoa-light/70 text-xs block">Fecha</label>
                    <input type="time" value={h.closeTime} onChange={(e) => updateHour(idx, 'closeTime', e.target.value)} className="input-field py-1.5 text-sm w-28" />
                  </div>
                  <div>
                    <label className="text-cocoa-light/70 text-xs block">Pausa início</label>
                    <input type="time" value={h.breakStart || ''} onChange={(e) => updateHour(idx, 'breakStart', e.target.value || null)} className="input-field py-1.5 text-sm w-28" />
                  </div>
                  <div>
                    <label className="text-cocoa-light/70 text-xs block">Pausa fim</label>
                    <input type="time" value={h.breakEnd || ''} onChange={(e) => updateHour(idx, 'breakEnd', e.target.value || null)} className="input-field py-1.5 text-sm w-28" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveHours} disabled={saving} className="btn-primary mt-6 px-5 py-2 text-sm disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar horários'}
        </button>
      </section>

      {/* Bloqueios de dia */}
      <section className="card p-5">
        <h3 className="text-cocoa-dark font-medium mb-1">Bloqueios de agenda</h3>
        <p className="text-cocoa-light text-xs mb-5 font-light">Bloquear dias específicos (férias, feriados, cursos). Sem horário = dia inteiro bloqueado.</p>
        <form onSubmit={handleAddBlock} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Data</label>
            <input type="date" value={newBlock.date} onChange={(e) => setNewBlock((b) => ({ ...b, date: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Motivo</label>
            <input value={newBlock.reason} onChange={(e) => setNewBlock((b) => ({ ...b, reason: e.target.value }))} placeholder="ex: Curso" className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Início (opcional)</label>
            <input type="time" value={newBlock.startTime} onChange={(e) => setNewBlock((b) => ({ ...b, startTime: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Fim (opcional)</label>
            <input type="time" value={newBlock.endTime} onChange={(e) => setNewBlock((b) => ({ ...b, endTime: e.target.value }))} className="input-field" />
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-sm col-span-2 sm:col-span-4">Adicionar bloqueio</button>
        </form>
        <div className="space-y-2">
          {blocks.length === 0 && <p className="text-cocoa-light/60 text-sm font-light">Nenhum bloqueio cadastrado.</p>}
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3 bg-white border border-linen rounded-2xl">
              <div>
                <p className="text-cocoa-dark text-sm">{fmt(b.date)} · {b.startTime ? `${b.startTime}–${b.endTime}` : 'Dia inteiro'}</p>
                {b.reason && <p className="text-cocoa-light text-xs font-light">{b.reason}</p>}
              </div>
              <button onClick={() => { deleteDayBlock(b.id).then(load); }} className="text-cocoa-light/60 hover:text-rose-dark text-xs ml-4 transition-colors">Remover</button>
            </div>
          ))}
        </div>
      </section>

      {/* Clientes fixas */}
      <section className="card p-5">
        <h3 className="text-cocoa-dark font-medium mb-1">Clientes fixas (horários recorrentes)</h3>
        <p className="text-cocoa-light text-xs mb-5 font-light">Reserva permanente por dia da semana, com a duração real do atendimento.</p>
        <form onSubmit={handleAddRecurring} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Nome</label>
            <input value={newRecurring.clientName} onChange={(e) => setNewRecurring((r) => ({ ...r, clientName: e.target.value }))} placeholder="Nome da cliente" className="input-field" required />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Dia da semana</label>
            <select value={newRecurring.dayOfWeek} onChange={(e) => setNewRecurring((r) => ({ ...r, dayOfWeek: e.target.value }))} className="input-field">
              {DAYS_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Horário</label>
            <input type="time" value={newRecurring.time} onChange={(e) => setNewRecurring((r) => ({ ...r, time: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Duração (min)</label>
            <input type="number" min="15" max="480" step="15" value={newRecurring.duration} onChange={(e) => setNewRecurring((r) => ({ ...r, duration: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-cocoa-light text-xs block mb-1">Obs (opcional)</label>
            <input value={newRecurring.notes} onChange={(e) => setNewRecurring((r) => ({ ...r, notes: e.target.value }))} className="input-field" />
          </div>
          <button type="submit" className="btn-primary px-4 py-2 text-sm col-span-2 sm:col-span-5">Adicionar</button>
        </form>
        <div className="space-y-2">
          {recurring.length === 0 && <p className="text-cocoa-light/60 text-sm font-light">Nenhuma cliente fixa cadastrada.</p>}
          {recurring.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-white border border-linen rounded-2xl">
              <div>
                <p className="text-cocoa-dark text-sm">{r.clientName} · {DAYS_FULL[r.dayOfWeek]} às {r.time} ({durLabel(r.duration)})</p>
                {r.notes && <p className="text-cocoa-light text-xs font-light">{r.notes}</p>}
              </div>
              <button onClick={() => { deleteRecurringBlock(r.id).then(load); }} className="text-cocoa-light/60 hover:text-rose-dark text-xs ml-4 transition-colors">Remover</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════ COMPARTILHADOS ═══════════════════════ */
function KpiCard({ title, value, sub, color }) {
  const colors = { rose: 'text-rose-dark', green: 'text-emerald-400', plain: 'text-cocoa-dark' };
  return (
    <div className="card p-4">
      <p className="text-cocoa-light text-xs mb-2 font-light">{title}</p>
      <p className={`text-xl font-bold ${colors[color] || 'text-cocoa-dark'}`}>{value}</p>
      {sub && <p className="text-cocoa-light/60 text-xs mt-1 font-light">{sub}</p>}
    </div>
  );
}

function ActionBtn({ color, onClick, children }) {
  const styles = {
    rose:   'bg-blush/70 border-rose/25 text-rose-dark hover:bg-blush',
    green:  'bg-emerald-900/30 border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/50',
    yellow: 'bg-amber-900/25 border-amber-800/40 text-amber-400 hover:bg-amber-900/40',
    red:    'bg-rose/5 border-rose/30 text-rose-dark hover:bg-rose/10',
  };
  return (
    <button onClick={onClick} className={`px-3 py-1.5 border text-xs rounded-full transition-all ${styles[color]}`}>
      {children}
    </button>
  );
}

function EditModal({ appointment, onClose, onSaved }) {
  const [allServices, setAllServices] = useState([]);
  const [form, setForm] = useState({
    clientName:  appointment.clientName,
    clientPhone: appointment.clientPhone,
    date:        appointment.date,
    time:        appointment.time,
    notes:       appointment.notes || '',
    serviceIds:  appointment.services?.map((as) => as.serviceId) || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllServices().then((r) => setAllServices(r.data.filter((s) => s.active)));
  }, []);

  const toggleSvc = (id) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.serviceIds.length === 0) { setError('Selecione ao menos um serviço'); return; }
    setSaving(true); setError('');
    try {
      await updateAppointment(appointment.id, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar alterações');
    } finally { setSaving(false); }
  };

  const totalDur   = allServices.filter((s) => form.serviceIds.includes(s.id)).reduce((t, s) => t + s.duration, 0);
  const totalPrice = allServices.filter((s) => form.serviceIds.includes(s.id)).reduce((t, s) => t + s.price, 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4">
      <div className="bg-cream border border-linen rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-linen flex items-center justify-between sticky top-0 bg-cream z-10">
          <div>
            <h3 className="text-cocoa-dark font-medium text-sm">Editar agendamento</h3>
            <p className="text-cocoa-light text-xs font-light">#{appointment.id} · {appointment.clientName}</p>
          </div>
          <button onClick={onClose} className="text-cocoa-light hover:text-cocoa-dark text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Nome</label>
              <input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Telefone</label>
              <input type="tel" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="text-cocoa-light text-xs block mb-1">Horário</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="input-field" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-cocoa-light text-xs">Serviços</label>
              {form.serviceIds.length > 0 && (
                <span className="text-cocoa-light text-xs font-light">{durLabel(totalDur)} · {fmtCurrency(totalPrice)}</span>
              )}
            </div>
            <div className="space-y-2">
              {allServices.map((s) => {
                const checked = form.serviceIds.includes(s.id);
                return (
                  <label key={s.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border cursor-pointer transition-all ${
                      checked ? 'bg-blush/70 border-rose/40' : 'bg-white border-linen hover:border-rose/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-rose bg-rose' : 'border-linen'}`}>
                        {checked && <div className="w-2 h-1.5 bg-cream rounded-sm" />}
                      </div>
                      <div>
                        <p className={`text-sm ${checked ? 'text-rose-dark' : 'text-cocoa-dark'}`}>{s.name}</p>
                        <p className="text-cocoa-light text-xs font-light">{durLabel(s.duration)}</p>
                      </div>
                    </div>
                    <span className="text-cocoa-light text-sm shrink-0 ml-3">{fmtCurrency(s.price)}</span>
                    <input type="checkbox" className="hidden" checked={checked} readOnly onClick={() => toggleSvc(s.id)} />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-cocoa-light text-xs block mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2} className="input-field resize-none" placeholder="Opcional..." />
          </div>

          {error && (
            <div className="bg-rose/5 border border-rose/30 rounded-2xl px-3 py-2">
              <p className="text-rose-dark text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-white border border-linen text-cocoa-light py-2.5 rounded-full text-sm hover:text-cocoa-dark transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-linen border-t-rose rounded-full animate-spin" />
    </div>
  );
}
