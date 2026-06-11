import { useState } from 'react';
import { lookupAppointment, cancelAppointmentPublic } from '../services/api';
import { BRAND } from '../config/brand';

const STATUS = {
  confirmed: { label: 'Confirmado', color: 'text-rose-dark' },
  completed: { label: 'Concluído', color: 'text-emerald-400' },
  no_show:   { label: 'Não compareceu', color: 'text-amber-400' },
  cancelled: { label: 'Cancelado', color: 'text-cocoa-light' },
};

function fmtDate(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}
function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}
function durLabel(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
}

export default function MinhaReserva() {
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    setAppointments(null);
    try {
      const r = await lookupAppointment(phone.trim());
      setAppointments(r.data);
    } catch {
      setError('Erro ao buscar reservas. Verifique o número e tente novamente.');
    } finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva?')) return;
    setCancelling(id);
    setError('');
    try {
      await cancelAppointmentPublic(id, phone.trim());
      // Só remove da UI após confirmação do servidor
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      const msg = e.response?.data?.error || 'Erro ao cancelar. Tente novamente.';
      setError(msg);
    } finally { setCancelling(null); }
  };

  return (
    <div className="min-h-[80vh] px-6 py-16">
      <div className="max-w-lg mx-auto">
        <p className="section-label mb-3">{BRAND.fullName} · {BRAND.professional}</p>
        <h1 className="text-3xl text-cocoa-dark mb-2">Minha reserva</h1>
        <p className="text-cocoa-light text-sm mb-10 font-light">Consulte ou cancele seu horário usando o número de telefone que usou no agendamento.</p>

        <form onSubmit={handleSearch} className="card p-5 space-y-4 mb-6">
          <div>
            <label className="text-cocoa-light text-xs block mb-2">Telefone / WhatsApp</label>
            <input
              type="tel"
              placeholder="(21) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-40">
            {loading ? 'Buscando...' : 'Buscar reservas'}
          </button>
        </form>

        {error && (
          <div className="bg-rose/5 border border-rose/30 rounded-2xl px-4 py-3 mb-4">
            <p className="text-rose-dark text-sm">{error}</p>
          </div>
        )}

        {appointments !== null && (
          <div>
            {appointments.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-cocoa-dark font-medium mb-1">Nenhuma reserva encontrada</p>
                <p className="text-cocoa-light text-sm font-light">Verifique o número informado ou faça um novo agendamento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-cocoa-light text-xs font-light">{appointments.length} reserva{appointments.length !== 1 ? 's' : ''} encontrada{appointments.length !== 1 ? 's' : ''}</p>
                {appointments.map((a) => (
                  <div key={a.id} className="card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-cocoa-dark font-medium capitalize">{fmtDate(a.date)}</p>
                        <p className="text-rose font-serif text-3xl">{a.time}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full bg-petal border border-linen ${STATUS[a.status]?.color}`}>
                        {STATUS[a.status]?.label}
                      </span>
                    </div>

                    <div className="border-t border-petal pt-4 space-y-2 text-sm">
                      <Row label="Serviço" value={a.services?.map((as) => as.service?.name).filter(Boolean).join(' + ') || '—'} />
                      <Row label="Duração" value={durLabel(a.totalDuration)} />
                      <Row label="Valor" value={fmtCurrency(a.price)} accent />
                    </div>

                    {a.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(a.id)}
                        disabled={cancelling === a.id}
                        className="w-full py-2.5 text-sm border border-rose/30 text-rose-dark rounded-full hover:bg-rose/5 transition-all disabled:opacity-40"
                      >
                        {cancelling === a.id ? 'Cancelando...' : 'Cancelar reserva'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <a href="/agendar" className="text-rose text-sm hover:text-rose-dark transition-colors">
            Fazer novo agendamento →
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-cocoa-light font-light">{label}</span>
      <span className={`font-medium ${accent ? 'text-rose-dark' : 'text-cocoa-dark'}`}>{value}</span>
    </div>
  );
}
