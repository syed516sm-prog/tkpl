import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { List, SignOut, UserPlus, X } from '@phosphor-icons/react';
import { useTournament } from '../context/TournamentContext';
import { BrandMark, BrandWordmark } from './BrandLogo';

interface NavLinkItem {
  label: string;
  to: string;
  isActive: (pathname: string) => boolean;
}

const isActive = (pathname: string, path: string) =>
  path === '/' ? pathname === '/' : pathname.startsWith(path);

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { adminSession, logoutAdmin } = useTournament();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const links: NavLinkItem[] = [
    { label: 'Home', to: '/', isActive: (p) => isActive(p, '/') },
    { label: 'Register', to: '/register', isActive: (p) => isActive(p, '/register') },
    {
      label: 'Find Ticket',
      to: '/find-ticket',
      isActive: (p) => p.startsWith('/find-ticket') || p.startsWith('/check-status'),
    },
    {
      label: adminSession ? 'Admin Desk' : 'Admin',
      to: adminSession ? '/admin' : '/admin/login',
      isActive: (p) => isActive(p, '/admin'),
    },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [menuOpen]);

  // The receipt prints on its own paper: no navigation chrome.
  const hideInPrint = location.pathname.startsWith('/receipt');

  return (
    <header
      className={`${hideInPrint ? 'no-print ' : ''}sticky top-0 z-50 border-b border-brand-line/80 bg-brand-ink/85 backdrop-blur-xl`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="T-KPL home"
          className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-lime"
        >
          <BrandMark size={36} />
          <BrandWordmark />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:ml-auto md:flex">
          {links.map((link) => {
            const active = link.isActive(location.pathname);
            return (
              <Link
                key={link.label}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-lg px-3 py-2 text-[13px] font-medium tracking-wide transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-brand-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 -bottom-[3px] h-[2px] rounded-full transition-opacity ${
                    active
                      ? 'bg-brand-lime opacity-100 shadow-[0_0_12px_rgba(182,255,46,0.8)]'
                      : 'opacity-0'
                  }`}
                />
              </Link>
            );
          })}

          {adminSession && (
            <button
              type="button"
              onClick={logoutAdmin}
              title="Sign out of the admin session"
              className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-brand-line px-2.5 py-2 text-[13px] font-medium text-brand-muted transition hover:border-brand-red/50 hover:text-white"
            >
              <SignOut size={15} />
              <span>Sign out</span>
            </button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          <Link
            to="/register"
            aria-current={isActive(location.pathname, '/register') ? 'page' : undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-lime px-3.5 py-2 text-[12px] font-black tracking-wide text-brand-ink uppercase transition hover:brightness-110 active:scale-[0.98] sm:px-4 sm:text-[13px]"
          >
            <UserPlus size={15} weight="bold" />
            <span>Register Now</span>
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-line text-zinc-200 transition hover:bg-white/5 md:hidden"
          >
            {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-panel"
        ref={panelRef}
        hidden={!menuOpen}
        className="border-t border-brand-line/80 bg-brand-ink/95 px-4 pb-4 pt-2 md:hidden"
      >
        <nav aria-label="Mobile navigation" className="flex flex-col">
          {links.map((link) => {
            const active = link.isActive(location.pathname);
            return (
              <Link
                key={link.label}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-lime/10 text-white'
                    : 'text-brand-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-lime" />
                )}
              </Link>
            );
          })}

          {adminSession && (
            <button
              type="button"
              onClick={logoutAdmin}
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium text-brand-muted transition hover:bg-white/5 hover:text-white"
            >
              <SignOut size={16} />
              <span>Sign out of admin</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
