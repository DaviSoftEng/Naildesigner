import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getServices, getGallery, getBusinessHours, getBookingSettings, mediaUrl } from '../services/api';
import { useInView } from '../hooks/useInView';
import { BRAND } from '../config/brand';

function Reveal({ children, className = '', delay = '' }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} className={`reveal ${delay} ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const CATEGORY_LABEL = { unhas: 'Unhas', sobrancelhas: 'Sobrancelhas' };

function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}
function durLabel(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
}

// Agrupa dias consecutivos com mesmo horário em faixas (ex: Ter–Sex)
function groupHours(hours) {
  if (!hours?.length) return [];
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const groups = [];
  let cur = null;
  for (const h of sorted) {
    if (cur && cur.isOpen === h.isOpen && cur.openTime === h.openTime && cur.closeTime === h.closeTime) {
      cur.endDay = h.dayOfWeek;
    } else {
      if (cur) groups.push(cur);
      cur = { startDay: h.dayOfWeek, endDay: h.dayOfWeek, isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime };
    }
  }
  if (cur) groups.push(cur);
  return groups.map((g) => ({
    days: g.startDay === g.endDay ? DAYS_FULL[g.startDay] : `${DAYS_FULL[g.startDay]} a ${DAYS_FULL[g.endDay]}`,
    hours: g.isOpen ? `${g.openTime} – ${g.closeTime}` : 'Fechado',
    open: g.isOpen,
  }));
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [settings, setSettings] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('todas');
  const [galleryFilter, setGalleryFilter] = useState('todas');
  const [galleryExpanded, setGalleryExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    getServices().then((r) => setServices(r.data)).catch(() => {});
    getGallery().then((r) => setGallery(r.data)).catch(() => {});
    getBusinessHours().then((r) => setBusinessHours(r.data)).catch(() => {});
    getBookingSettings().then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const filteredServices = serviceFilter === 'todas' ? services : services.filter((s) => s.category === serviceFilter);
  const filteredGallery = galleryFilter === 'todas' ? gallery : gallery.filter((g) => g.category === galleryFilter);

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] -mt-[68px] flex items-center overflow-hidden">
        {/* Fundo decorativo: luzes rosé/douradas com respiração estilo "breathing" */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-[34rem] h-[34rem] rounded-full bg-rose/40 blur-3xl animate-breathe" />
          <div className="absolute top-1/3 -left-44 w-[26rem] h-[26rem] rounded-full bg-gold/30 blur-3xl animate-breathe" style={{ animationDelay: '1.5s' }} />
          <div className="absolute -bottom-48 right-1/4 w-[30rem] h-[30rem] rounded-full bg-rose-light/30 blur-3xl animate-breathe" style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-28 pb-20">
          <div className="max-w-2xl">
            <p className="section-label mb-6" style={{ animation: 'fadeInUp 0.7s ease 0.1s both' }}>
              {BRAND.fullName} · {BRAND.tagline}
            </p>
            <h1
              className="text-[clamp(2.8rem,7.5vw,5.5rem)] leading-[1.04] tracking-tight text-cocoa-dark"
              style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
            >
              Unhas impecáveis,<br />
              <em className="text-shimmer italic">autoestima</em> renovada.
            </h1>
            <p
              className="text-cocoa-light text-lg mt-8 leading-relaxed max-w-md font-light"
              style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s both' }}
            >
              Nail design e sobrancelhas com técnica, carinho e hora marcada.
              Escolha seu horário online em menos de um minuto.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-10" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.45s both' }}>
              <Link to="/agendar" className="btn-primary animate-glow px-8 py-3.5 text-sm">
                Agendar meu horário
              </Link>
              <a href="#portfolio" className="text-cocoa-light hover:text-rose-dark text-sm transition-colors duration-200 underline underline-offset-4 decoration-rose-light">
                Ver trabalhos ↓
              </a>
            </div>
          </div>

          {/* Faixa de destaques */}
          <div
            className="flex flex-wrap gap-x-10 gap-y-4 mt-16 pt-8 border-t border-linen"
            style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both' }}
          >
            {[
              ['Hora marcada', 'sem fila, sem espera'],
              ['Materiais esterilizados', 'cuidado em cada detalhe'],
              [`${BRAND.experienceYears} anos de experiência`, 'técnica e delicadeza'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-cocoa-dark font-serif text-lg">{v}</p>
                <p className="text-cocoa-light/80 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <section id="servicos" className="scroll-mt-20 bg-white border-y border-linen">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
          <Reveal className="text-center max-w-xl mx-auto mb-10">
            <p className="section-label mb-4">Nossos cuidados</p>
            <h2 className="text-4xl sm:text-5xl text-cocoa-dark leading-tight">
              Serviços feitos <em className="text-rose italic">para você</em>
            </h2>
            <p className="text-cocoa-light mt-5 leading-relaxed font-light">
              Do alongamento em gel ao design de sobrancelhas — tudo com agendamento online.
            </p>
          </Reveal>

          {/* Filtro por categoria */}
          <Reveal className="flex justify-center gap-2 mb-10">
            {['todas', 'unhas', 'sobrancelhas'].map((c) => (
              <button
                key={c}
                onClick={() => setServiceFilter(c)}
                className={`chip ${serviceFilter === c ? 'chip-on' : 'chip-off'}`}
              >
                {c === 'todas' ? 'Todos' : CATEGORY_LABEL[c]}
              </button>
            ))}
          </Reveal>

          <Reveal delay="reveal-delay-1">
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((s) => (
                  <ServiceCard key={s.id} s={s} />
                ))}
              </div>
            ) : (
              <p className="text-cocoa-light/60 text-center">Carregando...</p>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── PORTFÓLIO ── */}
      <section id="portfolio" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
          <Reveal className="text-center max-w-xl mx-auto mb-10">
            <p className="section-label mb-4">Portfólio</p>
            <h2 className="text-4xl sm:text-5xl text-cocoa-dark leading-tight">
              Trabalhos que <em className="text-rose italic">falam por si</em>
            </h2>
            <p className="text-cocoa-light mt-5 leading-relaxed font-light">
              Um pouco do que sai das nossas mãos — direto do studio.
            </p>
          </Reveal>

          <Reveal className="flex justify-center gap-2 mb-10">
            {['todas', 'unhas', 'sobrancelhas'].map((c) => (
              <button
                key={c}
                onClick={() => setGalleryFilter(c)}
                className={`chip ${galleryFilter === c ? 'chip-on' : 'chip-off'}`}
              >
                {c === 'todas' ? 'Tudo' : CATEGORY_LABEL[c]}
              </button>
            ))}
          </Reveal>

          <Reveal delay="reveal-delay-1">
            {filteredGallery.length === 0 ? (
              <p className="text-cocoa-light/60 text-center">Em breve, fotos dos nossos trabalhos. 💅</p>
            ) : galleryExpanded ? (
              /* Grade completa (mosaico) ao expandir */
              <div className="columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
                {filteredGallery.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setLightbox(g)}
                    className="group relative w-full mb-4 rounded-3xl overflow-hidden border border-linen bg-petal break-inside-avoid text-left"
                  >
                    <img
                      src={mediaUrl(g.image)}
                      alt={g.caption || 'Trabalho do studio'}
                      loading="lazy"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pt-10 pb-3 flex items-end justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-cocoa-dark text-sm font-light">{g.caption}</p>
                      {g.price != null && (
                        <span className="text-gold font-serif text-sm whitespace-nowrap">{fmtCurrency(g.price)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Carrossel lento (vitrine) — pausa ao passar o mouse */
              <div className="gallery-marquee">
                <div className="gallery-track">
                  {[...filteredGallery, ...filteredGallery].map((g, i) => (
                    <button
                      key={`${g.id}-${i}`}
                      onClick={() => setLightbox(g)}
                      aria-hidden={i >= filteredGallery.length}
                      tabIndex={i >= filteredGallery.length ? -1 : 0}
                      className="gallery-slide group relative rounded-3xl overflow-hidden border border-linen bg-petal text-left"
                    >
                      <img
                        src={mediaUrl(g.image)}
                        alt={g.caption || 'Trabalho do studio'}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3.5 pt-12 pb-3 flex items-end justify-between gap-2">
                        <p className="text-cocoa-dark text-xs font-light leading-tight">{g.caption}</p>
                        {g.price != null && (
                          <span className="text-gold font-serif text-sm whitespace-nowrap">{fmtCurrency(g.price)}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Reveal>

          {filteredGallery.length > 0 && (
            <Reveal className="text-center mt-10">
              <button onClick={() => setGalleryExpanded((v) => !v)} className="chip chip-off">
                {galleryExpanded ? 'Ver menos ↑' : 'Ver todos os trabalhos →'}
              </button>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── SOBRE ── */}
      <section id="sobre" className="scroll-mt-20 bg-white border-y border-linen">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Retrato da profissional (client/public/profissional.jpg) */}
            <Reveal>
              <div className="relative max-w-lg mx-auto lg:mx-0 rounded-[2rem] overflow-hidden border border-linen bg-petal shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
                <img
                  src="/profissional.jpg"
                  alt={`${BRAND.professional} — ${BRAND.professionalRole}`}
                  className="w-full h-auto"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </Reveal>

            {/* Texto */}
            <Reveal delay="reveal-delay-2">
              <p className="section-label mb-5">Quem cuida de você</p>
              <h2 className="text-4xl sm:text-5xl text-cocoa-dark leading-tight mb-6">
                {BRAND.professional.split(' ')[0]}<br />
                <em className="text-rose italic">{BRAND.professional.split(' ').slice(1).join(' ')}</em>
              </h2>
              <p className="text-cocoa-light leading-relaxed mb-4 font-light">
                O {BRAND.fullName} nasceu de um sonho: criar um espaço onde cada mulher
                pudesse parar, respirar e sair se sentindo mais bonita e confiante.
                Aqui, unha não é detalhe — é cuidado, é arte, é o seu momento.
              </p>
              <p className="text-cocoa-light/80 leading-relaxed mb-8 text-sm font-light">
                Com {BRAND.experienceYears} anos de experiência e especializações em alongamento,
                esmaltação em gel e design de sobrancelhas, {BRAND.professional.split(' ')[0]} une
                técnica apurada e atenção genuína a cada cliente.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  'Alongamentos resistentes e naturais',
                  'Materiais esterilizados e descartáveis',
                  'Atendimento individual, sem pressa',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-rose" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3.5 3.5L15 6" />
                    </svg>
                    <span className="text-cocoa text-sm font-light">{item}</span>
                  </div>
                ))}
              </div>

              <Link to="/agendar" className="btn-primary inline-block px-7 py-3 text-sm">
                Agendar com {BRAND.professional.split(' ')[0]}
              </Link>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── POLÍTICA DE AGENDAMENTO ── */}
      {settings && (settings.depositPercent > 0 || settings.cancelHours > 0) && (
        <section>
          <div className="max-w-6xl mx-auto px-6 py-16">
            <Reveal>
              <div className="rounded-[2.5rem] bg-petal border border-linen p-8 sm:p-12">
                <div className="flex flex-col sm:flex-row sm:items-start gap-8">
                  <div className="shrink-0">
                    <p className="section-label mb-2">Como funciona</p>
                    <h3 className="text-2xl sm:text-3xl text-cocoa-dark">Política de agendamento</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6 flex-1">
                    {settings.depositPercent > 0 && (
                      <div className="flex gap-3">
                        <span className="w-9 h-9 rounded-full bg-rose/10 text-rose flex items-center justify-center shrink-0 font-serif">%</span>
                        <div>
                          <p className="text-cocoa-dark font-medium text-sm">Sinal de {settings.depositPercent}%</p>
                          <p className="text-cocoa-light text-sm font-light mt-1">
                            Para garantir seu horário, pedimos um sinal de {settings.depositPercent}% do valor
                            {settings.depositPixKey ? ' via Pix' : ''}, descontado no dia do atendimento.
                          </p>
                        </div>
                      </div>
                    )}
                    {settings.cancelHours > 0 && (
                      <div className="flex gap-3">
                        <span className="w-9 h-9 rounded-full bg-rose/10 text-rose flex items-center justify-center shrink-0 font-serif">⏰</span>
                        <div>
                          <p className="text-cocoa-dark font-medium text-sm">Cancelamento até {settings.cancelHours}h antes</p>
                          <p className="text-cocoa-light text-sm font-light mt-1">
                            Imprevistos acontecem! Avise com pelo menos {settings.cancelHours} horas de
                            antecedência para remarcar sem perder o sinal.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── LOCALIZAÇÃO ── */}
      <section id="localizacao" className="scroll-mt-20 bg-white border-y border-linen">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

            <Reveal>
              <p className="section-label mb-5">Onde estamos</p>
              <h2 className="text-4xl sm:text-5xl text-cocoa-dark leading-tight mb-8">
                Venha nos <em className="text-rose italic">visitar</em>
              </h2>

              <div className="space-y-6">
                <div>
                  <p className="text-cocoa-light/70 text-xs uppercase tracking-wider mb-2">Endereço</p>
                  <a
                    href={BRAND.mapsUrl}
                    target="_blank" rel="noreferrer"
                    className="text-cocoa-dark font-medium hover:text-rose-dark transition-colors block"
                  >
                    {BRAND.addressLine1}
                  </a>
                  <p className="text-cocoa-light text-sm mt-0.5">{BRAND.addressLine2}</p>
                </div>

                <div className="h-px bg-linen" />

                <div>
                  <p className="text-cocoa-light/70 text-xs uppercase tracking-wider mb-2">Contato</p>
                  {BRAND.whatsapp && (
                    <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer"
                      className="text-cocoa-dark font-medium hover:text-rose-dark transition-colors block mb-2">
                      WhatsApp para dúvidas
                    </a>
                  )}
                  <a href={`https://instagram.com/${BRAND.instagram}`} target="_blank" rel="noreferrer"
                    className="text-cocoa-light text-sm hover:text-rose-dark transition-colors mt-0.5 block">
                    @{BRAND.instagram}
                  </a>
                </div>

                <div className="h-px bg-linen" />

                <div>
                  <p className="text-cocoa-light/70 text-xs uppercase tracking-wider mb-3">Horários</p>
                  {groupHours(businessHours).map(({ days, hours, open }) => (
                    <div key={days} className="flex justify-between py-2.5 border-b border-petal">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-rose' : 'bg-linen'}`} />
                        <span className="text-cocoa-light text-sm">{days}</span>
                      </div>
                      <span className={`text-sm font-medium ${open ? 'text-cocoa-dark' : 'text-cocoa-light/50'}`}>{hours}</span>
                    </div>
                  ))}
                  {businessHours.length === 0 && (
                    <p className="text-cocoa-light/50 text-sm">Carregando...</p>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Mapa */}
            <Reveal delay="reveal-delay-2">
              <div className="space-y-3">
                <div className="relative rounded-[2rem] overflow-hidden border border-linen aspect-[4/3] bg-petal">
                  <iframe
                    src={BRAND.mapsEmbedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Localização do ${BRAND.fullName}`}
                  />
                </div>

                <a
                  href={BRAND.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline flex items-center justify-center gap-2 w-full py-3 text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  Abrir no Google Maps
                </a>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <Reveal>
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-rose to-rose-dark p-10 sm:p-14 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                <h2 className="text-4xl sm:text-5xl text-white leading-tight max-w-md">
                  Seu momento de <em className="italic">cuidado</em> começa aqui.
                </h2>
                <div className="shrink-0">
                  <p className="text-white/70 text-sm mb-4 font-light">Agende online em menos de 1 minuto.</p>
                  <Link to="/agendar" className="inline-block bg-white text-rose-dark hover:bg-petal font-medium rounded-full px-8 py-3.5 text-sm transition-colors animate-glow">
                    Agendar agora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-linen bg-petal">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

            {/* Marca */}
            <div className="col-span-2 lg:col-span-1">
              <img src="/logo-marca.png" alt={BRAND.fullName} className="h-16 w-auto rounded-xl mb-4" />
              <p className="text-cocoa-light text-sm leading-relaxed max-w-xs font-light">
                {BRAND.tagline}. Agende online e viva seu momento de autocuidado.
              </p>
            </div>

            {/* Links rápidos */}
            <div>
              <h4 className="text-cocoa-dark text-sm font-medium mb-4">Navegação</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#servicos" className="text-cocoa-light hover:text-rose-dark transition-colors font-light">Serviços</a></li>
                <li><a href="#portfolio" className="text-cocoa-light hover:text-rose-dark transition-colors font-light">Portfólio</a></li>
                <li><a href="#sobre" className="text-cocoa-light hover:text-rose-dark transition-colors font-light">Sobre</a></li>
                <li><Link to="/agendar" className="text-cocoa-light hover:text-rose-dark transition-colors font-light">Agendamento</Link></li>
                <li><Link to="/minha-reserva" className="text-cocoa-light hover:text-rose-dark transition-colors font-light">Minha reserva</Link></li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-cocoa-dark text-sm font-medium mb-4">Contato</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href={BRAND.mapsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 text-cocoa-light hover:text-rose-dark transition-colors font-light">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    <span>{BRAND.addressLine1}<br />{BRAND.addressLine2}</span>
                  </a>
                </li>
                {BRAND.whatsapp && (
                  <li>
                    <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-cocoa-light hover:text-rose-dark transition-colors font-light">
                      <svg className="w-4 h-4 shrink-0 text-rose" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.578-.985z" /></svg>
                      WhatsApp
                    </a>
                  </li>
                )}
                <li>
                  <a href={`https://instagram.com/${BRAND.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-cocoa-light hover:text-rose-dark transition-colors font-light">
                    <svg className="w-4 h-4 shrink-0 text-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                    @{BRAND.instagram}
                  </a>
                </li>
              </ul>
            </div>

            {/* Horário */}
            <div>
              <h4 className="text-cocoa-dark text-sm font-medium mb-4">Horário</h4>
              <ul className="space-y-2 text-sm">
                {groupHours(businessHours).map(({ days, hours, open }) => (
                  <li key={days} className="flex flex-col">
                    <span className="text-cocoa-light font-light">{days}</span>
                    <span className={open ? 'text-cocoa' : 'text-cocoa-light/50'}>{hours}</span>
                  </li>
                ))}
                {businessHours.length === 0 && <li className="text-cocoa-light/50">—</li>}
              </ul>
            </div>

          </div>

          <div className="border-t border-linen mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-cocoa-light/70 text-xs font-light">© {new Date().getFullYear()} {BRAND.fullName} · {BRAND.professional} — Todos os direitos reservados.</span>
            <span className="text-cocoa-light/50 text-xs font-light">{BRAND.addressLine2}</span>
          </div>
        </div>
      </footer>

      {/* Lightbox do portfólio */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 py-6" onClick={() => setLightbox(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={mediaUrl(lightbox.image)} alt={lightbox.caption || ''} className="w-full rounded-3xl" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-cocoa-dark text-sm font-light">{lightbox.caption}</p>
              <button onClick={() => setLightbox(null)} className="text-cocoa-light hover:text-cocoa-dark text-sm">Fechar ✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Card de serviço ────────────────────────────────────────────────────── */
function ServiceCard({ s }) {
  return (
    <div className="group card p-6 hover:border-rose/40 hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block text-[10px] uppercase tracking-[0.18em] text-rose bg-blush rounded-full px-2.5 py-1 mb-3">
            {CATEGORY_LABEL[s.category] || s.category}
          </span>
          <h3 className="text-cocoa-dark font-serif text-xl leading-snug">{s.name}</h3>
          <p className="text-cocoa-light text-sm mt-2 font-light leading-relaxed">{s.description}</p>
        </div>
        {mediaUrl(s.image) && (
          <img
            src={mediaUrl(s.image)}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border border-linen shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-petal">
        <div className="flex items-baseline gap-2">
          <span className="text-rose-dark font-serif text-2xl">{fmtCurrency(s.price)}</span>
          <span className="text-cocoa-light/70 text-xs">· {durLabel(s.duration)}</span>
        </div>
        <Link
          to={`/agendar?servico=${s.id}`}
          className="text-rose hover:text-rose-dark text-sm font-medium transition-colors"
        >
          Agendar →
        </Link>
      </div>
    </div>
  );
}
