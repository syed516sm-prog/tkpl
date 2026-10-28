import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PhoneCall, YoutubeLogo } from '@phosphor-icons/react';
import { useTournament } from '../context/TournamentContext';
import { BrandMark } from './BrandLogo';

const CONTACTS = [
  { shop: 'Sultan Sports', phone: '9110744945', logo: '/assets/sultan-sports-logo.png' },
  { shop: 'NR Sports', phone: '8919155512', logo: '/assets/nr-sports-logo.png' },
];

export const Footer: React.FC = () => {
  const { settings } = useTournament();
  const location = useLocation();
  const compact = location.pathname.startsWith('/admin');
  // The receipt prints on its own paper, so the footer never shows there.
  const printHidden = location.pathname.startsWith('/receipt') ? 'no-print ' : '';

  if (compact) {
    return (
      <footer className={`${printHidden}border-t border-brand-line/80 bg-brand-ink px-4 py-6 text-brand-muted sm:px-6 lg:px-8`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="font-semibold text-zinc-300">{settings.tournament_name}</span>
          </div>
          <p>© {new Date().getFullYear()} · New Kadapa &amp; Old Kadapa players only</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`${printHidden}border-t border-brand-line/80 bg-brand-ink px-4 py-12 text-brand-muted sm:px-6 lg:px-8`}>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark size={36} />
              <span className="font-display text-sm leading-tight font-black tracking-tight text-white">
                {settings.tournament_name}
              </span>
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed">{settings.privacy_notice}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand-line px-3 py-1 text-[11px] font-semibold text-zinc-300">
              <YoutubeLogo size={15} weight="fill" className="text-brand-red" />
              <span>All matches live on YouTube</span>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.22em] text-zinc-400 uppercase">
              Policies
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/policies/terms" className="transition hover:text-brand-lime">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/policies/refund" className="transition hover:text-brand-lime">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy" className="transition hover:text-brand-lime">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/pricing" className="transition hover:text-brand-lime">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/policies/contact" className="transition hover:text-brand-lime">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.22em] text-zinc-400 uppercase">
              Contact
            </h3>
            <div className="mt-3">
              <ul className="space-y-3">
                {CONTACTS.map((c) => (
                  <li key={c.shop} className="flex items-center justify-between gap-3">
                    <img src={c.logo} alt={`${c.shop} logo`} loading="lazy" className="h-9 w-auto max-w-[96px] rounded object-contain" />
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-200 transition hover:text-brand-lime">
                      <PhoneCall size={13} weight="fill" />
                      <span>{c.phone}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-brand-line/70 pt-6 text-[11px] sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.tournament_name}</p>
          <p>New Kadapa &amp; Old Kadapa players only</p>
        </div>
      </div>
    </footer>
  );
};
