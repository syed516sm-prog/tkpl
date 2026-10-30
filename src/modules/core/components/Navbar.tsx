import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { List, SignOut, UserPlus, X } from '@phosphor-icons/react';
import { useTournament } from '../context/TournamentContext';
import { BrandMark, BrandWordmark, RoundLogo } from './BrandLogo';
import {
  InstagramIcon,
  TKPL_INSTAGRAM_URL,
  SULTAN_INSTAGRAM_URL,
} from './InstagramFollowSection';

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
      className={`${hideInPrint ? 'no-print ' : ''}sticky top-0 z-50 border-b border-white/10 bg-[#160205]/85 backdrop-blur-xl`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="T-KPL home"
          className="flex min-w-0 items-center gap-2 sm:gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-lime group"
        >
          {/* Official Round Sultan Sports Emblem */}
          <RoundLogo size={32} className="h-7 w-7 sm:h-9 sm:w-9 shrink-0" />

          {/* Thin Vertical Divider as shown in official artwork */}
          <span className="h-5 sm:h-7 w-[1.5px] bg-amber-400/40 shrink-0 mx-0.5" aria-hidden="true" />

          {/* TKPL Logo & Wordmark */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <BrandMark size={26} className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
            <BrandWordmark />
          </div>
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

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-3 shrink-0">
          <Link
            to="/register"
            aria-current={isActive(location.pathname, '/register') ? 'page' : undefined}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-lime px-2.5 py-1.5 text-[11px] font-black tracking-wide text-brand-ink uppercase whitespace-nowrap transition hover:brightness-110 active:scale-[0.98] sm:gap-1.5 sm:px-4 sm:py-2 sm:text-[13px]"
          >
            <UserPlus size={13} weight="bold" className="sm:h-4 sm:w-4" />
            <span>Register<span className="hidden sm:inline"> Now</span></span>
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-brand-line text-zinc-200 transition hover:bg-white/5 md:hidden"
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

          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
            <span className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400">
              Official Instagram
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={TKPL_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-950/20 py-2.5 px-2 text-xs font-semibold text-pink-300 transition hover:bg-pink-900/30 hover:text-white"
              >
                <InstagramIcon className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span className="truncate">TKPL League</span>
              </a>
              <a
                href={SULTAN_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-950/20 py-2.5 px-2 text-xs font-semibold text-pink-300 transition hover:bg-pink-900/30 hover:text-white"
              >
                <InstagramIcon className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span className="truncate">Sultan Sports</span>
              </a>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};
