import React from 'react';
import { PhoneCall } from '@phosphor-icons/react';

interface Organizer {
  name: string;
  shop: string;
  place: string;
  phone: string;
  photo: string;
  logo: string;
  accent: 'lime' | 'yellow';
}

const ORGANIZERS: Organizer[] = [
  {
    name: 'Mansoor',
    shop: 'Sultan Sports',
    place: 'Kadapa',
    phone: '9110744945',
    photo: '/assets/organizer-mansoor.jpeg',
    logo: '/assets/sultan-sports-logo.webp',
    accent: 'yellow',
  },
  {
    name: 'Sunil',
    shop: 'NR Sports',
    place: 'Vempalli',
    phone: '8919155512',
    photo: '/assets/organizer-sunil.jpeg',
    logo: '/assets/nr-sports-logo.webp',
    accent: 'lime',
  },
];

const ACCENTS = {
  lime: {
    ring: 'border-brand-lime/35 hover:border-brand-lime/60',
    text: 'text-brand-lime',
    phone: 'border-brand-lime/40 text-brand-lime hover:bg-brand-lime/10',
  },
  yellow: {
    ring: 'border-brand-yellow/35 hover:border-brand-yellow/60',
    text: 'text-brand-yellow',
    phone: 'border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10',
  },
} as const;

interface OrganizerStripProps {
  compact?: boolean;
}

export const OrganizerStrip: React.FC<OrganizerStripProps> = ({ compact = false }) => {
  return (
    <div className={`grid grid-cols-2 ${compact ? 'gap-3' : 'gap-4 sm:gap-6'}`}>
      {ORGANIZERS.map((organizer) => {
        const accent = ACCENTS[organizer.accent];
        return (
          <article
            key={organizer.name}
            className={`rounded-2xl border bg-brand-surface/80 transition-colors ${accent.ring} ${
              compact ? 'p-3' : 'p-4 sm:p-5'
            }`}
          >
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <span
                className={`relative overflow-hidden rounded-full ring-2 ring-brand-ink ${
                  compact ? 'h-14 w-14' : 'h-16 w-16 sm:h-20 sm:w-20'
                } shrink-0`}
              >
                <img
                  src={organizer.photo}
                  alt={`${organizer.name}, ${organizer.shop} ${organizer.place}`}
                  loading="lazy"
                  className="h-full w-full scale-[1.06] object-cover object-[50%_18%]"
                />
              </span>

              <div className="mt-2 min-w-0 sm:mt-0 sm:ml-3">
                <p className="truncate text-[15px] font-bold text-white">{organizer.name}</p>
                <p className={`truncate text-xs font-semibold ${accent.text}`}>
                  {organizer.shop}
                </p>
                <p className="truncate text-[11px] tracking-wide text-brand-muted uppercase">
                  {organizer.place}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3 sm:justify-between">
              <span className={`shrink-0 ${compact ? 'h-7' : 'h-8 sm:h-10'}`}>
                <img
                  src={organizer.logo}
                  alt={`${organizer.shop} logo`}
                  loading="lazy"
                  className="h-full w-auto max-w-[92px] rounded object-contain"
                />
              </span>
              <a
                href={`tel:${organizer.phone}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold transition ${accent.phone}`}
              >
                <PhoneCall size={12} weight="fill" />
                <span>{organizer.phone}</span>
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
};
