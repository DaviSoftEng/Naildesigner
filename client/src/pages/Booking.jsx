import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getServices, getAvailableSlots, createAppointment, getBusinessHours, getDayBlocks, getBookingSettings } from '../services/api';
import { BRAND } from '../config/brand';

const STEPS = ['Serviços', 'Data & Horário', 'Seus dados', 'Confirmar'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_WEEK = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const CATEGORY_LABEL = { unhas: 'Unhas', sobrancelhas: 'Sobrancelhas' };

function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function durLabel(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
}

export default function Booking() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [businessHours, setBusinessHours] = useState([]);
  const [dayBlocks, setDayBlocks] = useState([]);
  const [settings, setSettings] = useState({ bookingWindowDays: 14, whatsapp: '', depositPercent: 0, depositPixKey: '', cancelHours: 0 });
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [error, setError] = useState('');

  const today = toISO(new Date());
  const maxDate = (() => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() + settings.bookingWindowDays); return toISO(d); })();
  const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0);
  const totalDuration = selectedServices.reduce((s, sv) => s + sv.duration, 0);
  const depositValue = settings.depositPercent > 0 ? Math.round(totalPrice * settings.depositPercent) / 100 : 0;

  useEffect(() => {
    getServices().then((r) => {
      setServices(r.data);
      // Pré-seleciona o serviço vindo da home (?servico=ID)
      const preId = searchParams.get('servico');
      if (preId) {
        const found = r.data.find((s) => String(s.id) === preId);
        if (found) setSelectedServices([found]);
      }
    }).catch(() => {});
    // Chamadas independentes: a falha de uma não pode impedir as outras
    // (a página é pública — não deve depender de rota protegida por login)
    getBusinessHours().then((h) => setBusinessHours(h.data)).catch(() => {});
    getDayBlocks().then((b) => setDayBlocks(b.data)).catch(() => {});
    getBookingSettings().then((s) => {
      if (s.data) setSettings((prev) => ({ ...prev, ...s.data }));
    }).catch(() => {});
  }, []);

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
    setSelectedTime('');
    setSlots([]);
  };

  const loadSlots = useCallback(async (date, duration) => {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const r = await getAvailableSlots(date, duration);
      setSlots(r.data.available || []);
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, []);

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    loadSlots(dateStr, totalDuration);
  };

  const isDayUnavailable = (dateStr) => {
    if (dateStr < today) return true;
    if (dateStr > maxDate) return true; // além da janela de agendamento
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
    const bh = businessHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (bh && !bh.isOpen) return true;
    const block = dayBlocks.find((b) => b.date === dateStr && !b.startTime);
    if (block) return true;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const r = await createAppointment({
        clientName: form.name,
        clientPhone: form.phone,
        serviceIds: selectedServices.map((s) => s.id),
        date: selectedDate,
        time: selectedTime,
      });
      setBookedAppointment(r.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao agendar. Tente novamente.');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep(0); setSelectedServices([]); setSelectedDate(''); setSelectedTime('');
    setSlots([]); setForm({ name: '', phone: '' }); setSuccess(false);
    setBookedAppointment(null); setError('');
  };

  const filteredServices = categoryFilter === 'todas' ? services : services.filter((s) => s.category === categoryFilter);

  // ─── Tela de sucesso ───────────────────────────────────────────────────────
  if (success) {
    const apptServices = bookedAppointment.services?.map((as) => as.service) || [];
    const dataFmt = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const waMsg =
      `Olá! Acabei de confirmar meu agendamento ✅\n\n` +
      `👤 Nome: ${bookedAppointment.clientName}\n` +
      `📱 Telefone: ${bookedAppointment.clientPhone}\n` +
      `💅 Serviço: ${apptServices.map((s) => s.name).join(' + ') || '—'}\n` +
      `💰 Valor: ${fmtCurrency(bookedAppointment.price)}\n` +
      (depositValue > 0 ? `🔒 Sinal (${settings.depositPercent}%): ${fmtCurrency(depositValue)}\n` : '') +
      `📅 Data: ${dataFmt}\n` +
      `🕐 Horário: ${selectedTime}`;
    const waUrl = settings.whatsapp ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(waMsg)}` : null;
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="w-12 h-12 rounded-full bg-rose/10 border border-rose/30 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl text-cocoa-dark mb-1">Reserva feita! 💕</h2>
          <p className="text-cocoa-light text-sm mb-8 font-light">Mal podemos esperar para te receber.</p>
          <div className="card p-6 space-y-4 mb-6">
            <div>
              <p className="text-cocoa-light/70 text-xs mb-2">Serviços</p>
              {apptServices.map((s) => (
                <div key={s.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-cocoa-dark">{s.name}</span>
                  <span className="text-cocoa-light">{fmtCurrency(s.price)}</span>
                </div>
              ))}
            </div>
            <SummaryRow label="Data" value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} />
            <SummaryRow label="Horário" value={selectedTime} accent />
            <SummaryRow label="Duração" value={durLabel(bookedAppointment.totalDuration)} />
            <SummaryRow label="Nome" value={bookedAppointment.clientName} />
            <div className="border-t border-linen pt-4 space-y-2">
              <SummaryRow label="Total" value={fmtCurrency(bookedAppointment.price)} accent large />
              {depositValue > 0 && (
                <SummaryRow label={`Sinal (${settings.depositPercent}%)`} value={fmtCurrency(depositValue)} accent />
              )}
            </div>
          </div>

          {depositValue > 0 && (
            <div className="bg-petal border border-linen rounded-2xl px-4 py-3.5 mb-5">
              <p className="text-cocoa-dark text-sm font-medium mb-1">🔒 Garanta seu horário com o sinal</p>
              <p className="text-cocoa-light text-xs font-light leading-relaxed">
                Envie {fmtCurrency(depositValue)}{settings.depositPixKey ? <> via Pix para a chave <span className="font-medium text-cocoa-dark break-all">{settings.depositPixKey}</span></> : ' via Pix'} e
                mande o comprovante no WhatsApp. O valor é descontado no dia.
                {settings.cancelHours > 0 && ` Cancelamentos até ${settings.cancelHours}h antes não perdem o sinal.`}
              </p>
            </div>
          )}

          {waUrl && (
            <>
              <p className="text-cocoa-light text-xs text-center mb-2 font-light">Toque abaixo para confirmar com o studio 👇</p>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 mb-3 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-medium text-sm transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.738-.981z"/></svg>
                Confirmar no WhatsApp
              </a>
            </>
          )}
          <button onClick={reset} className={`w-full py-3 text-sm rounded-full transition-all ${waUrl ? 'border border-linen text-cocoa-light hover:text-cocoa-dark hover:border-rose/40' : 'btn-primary'}`}>Fazer outro agendamento</button>
        </div>
      </div>
    );
  }

  // ─── Flow principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-[80vh] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <p className="section-label mb-3">{BRAND.fullName} · {BRAND.professional}</p>
          <h1 className="text-3xl sm:text-4xl text-cocoa-dark">Agendar horário</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`h-[2px] flex-1 transition-all duration-300 ${i === 0 ? 'hidden' : i <= step ? 'bg-rose' : 'bg-linen'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                i <= step ? 'bg-rose text-white' : 'bg-white text-cocoa-light/50 border border-linen'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* ── Step 0: Serviços ─────────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <p className="text-cocoa-light text-sm mb-2">Selecione um ou mais serviços</p>
            <p className="text-cocoa-light/60 text-xs mb-5">Toque para marcar ou desmarcar</p>

            <div className="flex gap-2 mb-5">
              {['todas', 'unhas', 'sobrancelhas'].map((c) => (
                <button key={c} onClick={() => setCategoryFilter(c)} className={`chip ${categoryFilter === c ? 'chip-on' : 'chip-off'}`}>
                  {c === 'todas' ? 'Todos' : CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>

            <div className="divide-y divide-petal border border-linen rounded-3xl overflow-hidden mb-5 bg-white">
              {filteredServices.map((s) => {
                const selected = !!selectedServices.find((sv) => sv.id === s.id);
                return (
                  <button key={s.id} onClick={() => toggleService(s)}
                    className={`w-full px-5 py-4 text-left flex items-center justify-between transition-colors ${selected ? 'bg-blush/70' : 'hover:bg-petal'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-rose bg-rose' : 'border-linen'}`}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-colors ${selected ? 'text-rose-dark' : 'text-cocoa-dark'}`}>{s.name}</p>
                        <p className="text-cocoa-light/80 text-xs mt-0.5 font-light">{durLabel(s.duration)} · {s.description}</p>
                      </div>
                    </div>
                    <p className={`font-serif text-base ml-4 shrink-0 ${selected ? 'text-rose-dark' : 'text-rose'}`}>{fmtCurrency(s.price)}</p>
                  </button>
                );
              })}
              {filteredServices.length === 0 && (
                <p className="text-cocoa-light/60 text-sm text-center py-8">Carregando serviços...</p>
              )}
            </div>

            {selectedServices.length > 0 ? (
              <div className="card p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-cocoa-light text-xs font-light">{selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} · {durLabel(totalDuration)}</p>
                  <p className="text-cocoa-dark font-serif text-xl mt-0.5">{fmtCurrency(totalPrice)}</p>
                </div>
                <button onClick={() => setStep(1)} className="btn-primary px-6 py-2.5 text-sm">
                  Continuar →
                </button>
              </div>
            ) : (
              <button disabled className="btn-primary w-full py-3 text-sm opacity-20 cursor-not-allowed">Continuar</button>
            )}
          </div>
        )}

        {/* ── Step 1: Calendário + Horários ──────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-cocoa-light text-xs">{selectedServices.map((s) => s.name).join(' + ')}</p>
                <p className="text-cocoa-light/60 text-xs font-light">{durLabel(totalDuration)} · {fmtCurrency(totalPrice)}</p>
              </div>
              <button onClick={() => setStep(0)} className="text-cocoa-light hover:text-cocoa-dark text-xs transition-colors">← Serviços</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Calendário */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalMonth((m) => {
                    const d = new Date(m.year, m.month - 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })} className="text-cocoa-light hover:text-cocoa-dark px-2 text-lg transition-colors">‹</button>
                  <p className="text-cocoa-dark text-sm font-medium">{MONTHS[calMonth.month]} {calMonth.year}</p>
                  <button onClick={() => setCalMonth((m) => {
                    const d = new Date(m.year, m.month + 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })} className="text-cocoa-light hover:text-cocoa-dark px-2 text-lg transition-colors">›</button>
                </div>

                {/* Cabeçalho dias da semana */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS_WEEK.map((d) => (
                    <p key={d} className="text-center text-cocoa-light/50 text-xs py-1">{d}</p>
                  ))}
                </div>

                {/* Dias */}
                <CalendarGrid
                  year={calMonth.year}
                  month={calMonth.month}
                  today={today}
                  selectedDate={selectedDate}
                  isDayUnavailable={isDayUnavailable}
                  onDayClick={handleDayClick}
                />

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-petal">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose" /><span className="text-cocoa-light/70 text-xs">Selecionado</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-petal border border-linen" /><span className="text-cocoa-light/70 text-xs">Fechado / Passado</span></div>
                </div>
                <p className="text-cocoa-light/60 text-[11px] mt-3 font-light">Agenda aberta para os próximos {settings.bookingWindowDays} dias.</p>
              </div>

              {/* Horários */}
              <div className="card p-4">
                {!selectedDate ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <svg className="w-9 h-9 mb-3 text-linen" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4.5" width="18" height="16" rx="2" />
                      <path strokeLinecap="round" d="M3 9h18M8 2.5v4M16 2.5v4" />
                    </svg>
                    <p className="text-cocoa-light text-sm font-light">Selecione uma data no calendário para ver os horários disponíveis</p>
                  </div>
                ) : slotsLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="w-5 h-5 border-2 border-linen border-t-rose rounded-full animate-spin" />
                  </div>
                ) : (
                  <div>
                    <p className="text-cocoa-dark text-sm font-medium mb-1 capitalize">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </p>
                    <p className="text-cocoa-light/70 text-xs mb-4 font-light">
                      {slots.length > 0 ? `${slots.length} horário${slots.length !== 1 ? 's' : ''} disponível${slots.length !== 1 ? 'is' : ''}` : 'Sem horários disponíveis'}
                    </p>
                    {slots.length === 0 ? (
                      <p className="text-cocoa-light/60 text-sm text-center py-6 font-light">Tente outra data. 🌸</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                        {slots.map((slot) => (
                          <button key={slot} onClick={() => setSelectedTime(slot)}
                            className={`py-3 rounded-2xl text-sm font-medium transition-all ${
                              selectedTime === slot
                                ? 'bg-rose text-white'
                                : 'bg-white border border-linen text-cocoa-light hover:text-rose-dark hover:border-rose/40'
                            }`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <StepNav onBack={() => setStep(0)} onNext={() => setStep(2)} disableNext={!selectedDate || !selectedTime} />
          </div>
        )}

        {/* ── Step 2: Dados ────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <p className="text-cocoa-light text-sm mb-6">Seus dados para confirmação</p>
            <div className="card p-5 space-y-4">
              <div>
                <label className="text-cocoa-light text-xs block mb-2">Nome completo</label>
                <input type="text" placeholder="Maria Silva" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="text-cocoa-light text-xs block mb-2">Telefone / WhatsApp</label>
                <input type="tel" placeholder="(21) 99999-9999" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-field" />
              </div>
            </div>
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} disableNext={!form.name || !form.phone} />
          </div>
        )}

        {/* ── Step 3: Confirmar ─────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <p className="text-cocoa-light text-sm mb-6">Revise antes de confirmar</p>
            <div className="card p-5 space-y-4 mb-5">
              <div>
                <p className="text-cocoa-light/70 text-xs mb-2">Serviços</p>
                {selectedServices.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-cocoa-dark">{s.name}</span>
                    <span className="text-cocoa-light">{fmtCurrency(s.price)}</span>
                  </div>
                ))}
              </div>
              <SummaryRow label="Data" value={new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} />
              <SummaryRow label="Horário" value={`${selectedTime} (${durLabel(totalDuration)})`} accent />
              <SummaryRow label="Nome" value={form.name} />
              <SummaryRow label="Telefone" value={form.phone} />
              <div className="border-t border-linen pt-4 space-y-2">
                <SummaryRow label="Total" value={fmtCurrency(totalPrice)} accent large />
                {depositValue > 0 && (
                  <SummaryRow label={`Sinal (${settings.depositPercent}%)`} value={fmtCurrency(depositValue)} accent />
                )}
              </div>
            </div>

            {/* Política de sinal/cancelamento */}
            {(depositValue > 0 || settings.cancelHours > 0) && (
              <div className="bg-petal border border-linen rounded-2xl px-4 py-3.5 mb-5">
                <p className="text-cocoa-dark text-xs font-medium mb-1">🌸 Política do studio</p>
                <p className="text-cocoa-light text-xs font-light leading-relaxed">
                  {depositValue > 0 && (
                    <>Para garantir o horário, pedimos um sinal de <span className="text-cocoa-dark font-medium">{fmtCurrency(depositValue)}</span> ({settings.depositPercent}%) via Pix após a confirmação — descontado no dia do atendimento. </>
                  )}
                  {settings.cancelHours > 0 && (
                    <>Cancelamentos com até {settings.cancelHours}h de antecedência podem remarcar sem perder o sinal.</>
                  )}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-rose/5 border border-rose/30 rounded-2xl px-4 py-3 mb-4">
                <p className="text-rose-dark text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-white hover:bg-petal border border-linen text-cocoa-light py-3 rounded-full text-sm transition-all">
                Voltar
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 btn-primary py-3 text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                {loading ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Componente do calendário ───────────────────────────────────────────────
function CalendarGrid({ year, month, today, selectedDate, isDayUnavailable, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  // Células vazias antes do dia 1
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((day, idx) => {
        if (!day) return <div key={`e-${idx}`} />;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const unavailable = isDayUnavailable(dateStr);
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate;

        return (
          <button
            key={dateStr}
            disabled={unavailable}
            onClick={() => onDayClick(dateStr)}
            className={`aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center
              ${isSelected  ? 'bg-rose text-white'
              : unavailable ? 'text-linen cursor-not-allowed bg-petal/50'
              : isToday     ? 'text-rose border border-rose/40 hover:bg-blush'
              : 'text-cocoa-light hover:bg-blush hover:text-cocoa-dark'}`}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function SummaryRow({ label, value, accent, large }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-cocoa-light text-sm font-light">{label}</span>
      <span className={`${accent ? 'text-rose-dark' : 'text-cocoa-dark'} ${large ? 'text-lg font-serif' : 'text-sm font-medium'}`}>{value}</span>
    </div>
  );
}

function StepNav({ onBack, onNext, disableNext }) {
  return (
    <div className="flex gap-3 mt-5">
      <button onClick={onBack} className="flex-1 bg-white hover:bg-petal border border-linen text-cocoa-light py-3 rounded-full text-sm transition-all">
        Voltar
      </button>
      <button onClick={onNext} disabled={disableNext}
        className="flex-1 btn-primary py-3 text-sm disabled:opacity-20 disabled:cursor-not-allowed">
        Continuar
      </button>
    </div>
  );
}
