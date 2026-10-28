import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Clock, Envelope, MapPin, PhoneCall } from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';
import { formatInrFromPaise } from '../../core/lib/validation';
import { POLICIES, PRICING_ROWS, SUPPORT, type PolicyItem } from '../lib/policies';

const renderInline = (text: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );

export const PolicyPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { settings } = useTournament();
  const policy = POLICIES.find((p) => p.slug === slug);

  if (!policy) return <Navigate to="/policies/terms" replace />;

  const fee = formatInrFromPaise(settings.fee_paise);
  const fill = (text: string) => text.replace(/\{fee\}/g, fee).replace(/\{email\}/g, SUPPORT.email);

  const renderItem = (item: string | PolicyItem, key: number) => {
    const entry = typeof item === 'string' ? { text: item } : item;
    return (
      <li key={key} className="leading-relaxed">
        {renderInline(fill(entry.text))}
        {entry.sub && (
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-zinc-400 marker:text-brand-line">
            {entry.sub.map((s, i) => (
              <li key={i}>{renderInline(fill(s))}</li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="bg-brand-ink px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Policies" className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1">
          {POLICIES.map((p) => {
            const active = p.slug === policy.slug;
            return (
              <Link
                key={p.slug}
                to={`/policies/${p.slug}`}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                  active
                    ? 'border-brand-lime bg-brand-lime text-brand-ink'
                    : 'border-brand-line text-zinc-400 hover:border-brand-lime/50 hover:text-white'
                }`}
              >
                {p.shortTitle}
              </Link>
            );
          })}
        </nav>

        <header>
          <h1 className="font-display text-3xl font-black tracking-tight text-white [text-wrap:balance] sm:text-4xl">
            {policy.title}
          </h1>
          {policy.updated && (
            <p className="mt-2 text-xs text-brand-muted">Last updated: {policy.updated}</p>
          )}
          {policy.intro && (
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-zinc-400">{policy.intro}</p>
          )}
        </header>

        {policy.slug === 'pricing' && (
          <dl className="mt-8 divide-y divide-brand-line overflow-hidden rounded-2xl border border-brand-line bg-brand-surface">
            {PRICING_ROWS.map((row) => (
              <div key={row.field} className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <dt className="text-[11px] font-semibold tracking-[0.18em] text-brand-muted uppercase">
                  {row.field}
                </dt>
                <dd className="text-sm leading-relaxed text-zinc-200 tabular-nums">{fill(row.detail)}</dd>
              </div>
            ))}
          </dl>
        )}

        {policy.slug === 'contact' && (
          <div className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {SUPPORT.phones.map((c) => (
                <a
                  key={c.number}
                  href={`tel:${c.number}`}
                  className="group rounded-2xl border border-brand-line bg-brand-surface px-5 py-4 transition hover:border-brand-lime/50"
                >
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="text-xs text-brand-muted">{c.shop}</p>
                  <p className="mt-3 inline-flex items-center gap-2 font-mono text-sm font-bold text-brand-lime">
                    <PhoneCall size={16} weight="fill" />
                    +91 {c.number}
                  </p>
                </a>
              ))}
            </div>

            <div className="divide-y divide-brand-line rounded-2xl border border-brand-line bg-brand-surface text-sm">
              <div className="flex gap-3 px-5 py-4">
                <Envelope size={18} className="mt-0.5 shrink-0 text-brand-muted" />
                <a href={`mailto:${SUPPORT.email}`} className="break-all text-zinc-200 hover:text-brand-lime">
                  {SUPPORT.email}
                </a>
              </div>
              <div className="flex gap-3 px-5 py-4">
                <MapPin size={18} className="mt-0.5 shrink-0 text-brand-muted" />
                <address className="leading-relaxed text-zinc-200 not-italic">
                  {SUPPORT.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>
              <div className="flex gap-3 px-5 py-4">
                <Clock size={18} className="mt-0.5 shrink-0 text-brand-muted" />
                <div className="space-y-1 text-zinc-200">
                  {SUPPORT.hours.map((h) => (
                    <p key={h.days}>
                      <span className="text-brand-muted">{h.days}: </span>
                      {h.time}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-brand-muted">
              Official entity: T-KPL Organizing Committee, jointly managed by Sultan Sports and NR
              Sports.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-8">
          {policy.sections.map((section) => {
            const List = section.ordered ? 'ol' : 'ul';
            return (
              <section key={section.heading}>
                <h2 className="font-display text-lg font-black tracking-tight text-white sm:text-xl">
                  {fill(section.heading)}
                </h2>
                <List
                  className={`mt-3 space-y-3 pl-5 text-sm text-zinc-300 marker:text-brand-lime ${
                    section.ordered ? 'list-decimal' : 'list-disc'
                  }`}
                >
                  {section.items?.map(renderItem)}
                </List>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
