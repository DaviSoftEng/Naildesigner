import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';

const NAV_LINKS = [
  { label: 'Serviços',  href: '/#servicos'  },
  { label: 'Portfólio', href: '/#portfolio' },
  { label: 'Sobre',     href: '/#sobre'     },
  { label: 'Onde estamos', href: '/#localizacao' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled || !isHome
        ? 'border-b border-linen bg-cream/95 backdrop-blur-xl shadow-[0_2px_20px_rgba(183,110,121,0.06)]'
        : 'border-b border-transparent bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-[68px] flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="group shrink-0">
          <img
            src="/logo-marca.png"
            alt={BRAND.fullName}
            className="h-12 w-auto rounded-xl transition-opacity duration-200 group-hover:opacity-85"
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="btn-ghost">
              {l.label}
            </a>
          ))}

          <div className="w-px h-4 bg-linen mx-1" />

          {user ? (
            <>
              <Link to="/admin" className="btn-ghost">Painel</Link>
              <button onClick={() => { signOut(); navigate('/'); }} className="btn-ghost hover:text-rose-dark">
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-ghost">Entrar</Link>
          )}

          <Link to="/minha-reserva" className="btn-ghost">Minha reserva</Link>
          <Link to="/agendar" className="btn-primary ml-2 px-5 py-2 text-sm">
            Agendar
          </Link>
        </div>

        {/* Mobile: hamburger + agendar */}
        <div className="flex md:hidden items-center gap-3">
          <Link to="/agendar" className="btn-primary px-4 py-2 text-sm">
            Agendar
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-cocoa-light hover:text-cocoa-dark transition-colors p-1"
            aria-label="Menu"
          >
            <div className="space-y-1.5">
              <span className={`block h-px w-5 bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-px w-5 bg-current transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
              <span className={`block h-px w-5 bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden border-t border-linen bg-cream transition-all duration-300 overflow-hidden ${open ? 'max-h-96' : 'max-h-0'}`}>
        <div className="px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="block py-2.5 text-cocoa-light hover:text-cocoa-dark text-sm transition-colors">
              {l.label}
            </a>
          ))}
          <Link to="/minha-reserva" className="block py-2.5 text-cocoa-light hover:text-cocoa-dark text-sm transition-colors">Minha reserva</Link>
          <div className="h-px bg-linen my-3" />
          {user ? (
            <>
              <Link to="/admin" className="block py-2.5 text-cocoa-light hover:text-cocoa-dark text-sm transition-colors">Painel</Link>
              <button onClick={() => { signOut(); navigate('/'); }} className="block py-2.5 text-cocoa-light/70 hover:text-rose-dark text-sm transition-colors w-full text-left">Sair</button>
            </>
          ) : (
            <Link to="/login" className="block py-2.5 text-cocoa-light hover:text-cocoa-dark text-sm transition-colors">Entrar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
