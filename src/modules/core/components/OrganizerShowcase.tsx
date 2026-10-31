import React, { useEffect, useState, useRef } from 'react';
import { CaretLeft, CaretRight, PhoneCall, ShieldCheck, Sparkle } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';
import {
  InstagramIcon,
  SULTAN_INSTAGRAM_URL,
  NR_SPORTS_INSTAGRAM_URL,
} from './InstagramFollowSection';

interface OrganizerSlide {
  name: string;
  shop: string;
  place: string;
  phone: string;
  photo: string;
  logo: string;
  accent: string;
  badgeColor: string;
  instagramUrl?: string;
  instagramHandle?: string;
}

const SLIDES: OrganizerSlide[] = [
  {
    name: 'Mansoor',
    shop: 'Sultan Sports',
    place: 'Kadapa',
    phone: '9110744945',
    photo: '/assets/organizer-mansoor.jpeg',
    logo: '/assets/sultan-sports-logo.webp',
    accent: 'text-brand-yellow',
    badgeColor: 'border-brand-yellow/40 bg-brand-yellow/15 text-brand-yellow',
    instagramUrl: SULTAN_INSTAGRAM_URL,
    instagramHandle: '@sultansports_kadapa',
  },
  {
    name: 'Sunil',
    shop: 'NR Sports',
    place: 'Vempalli',
    phone: '8919155512',
    photo: '/assets/organizer-sunil.jpeg',
    logo: '/assets/nr-sports-logo.webp',
    accent: 'text-brand-lime',
    badgeColor: 'border-brand-lime/40 bg-brand-lime/15 text-brand-lime',
    instagramUrl: NR_SPORTS_INSTAGRAM_URL,
    instagramHandle: '@nr_sports_vempalli',
  },
];

const CYCLE_MS = 8000;

export const OrganizerShowcase: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion || isPaused) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % SLIDES.length),
      CYCLE_MS
    );
    return () => window.clearInterval(id);
  }, [reduceMotion, isPaused]);

  const nextSlide = () => setIndex((current) => (current + 1) % SLIDES.length);
  const prevSlide = () => setIndex((current) => (current - 1 + SLIDES.length) % SLIDES.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      nextSlide();
    } else if (distance < -45) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      aria-label="Tournament organizers"
      className="relative border-b border-white/[0.08] px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
    >
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-lime/35 bg-brand-lime/10 px-3.5 py-1 text-[11px] font-bold tracking-[0.24em] text-brand-lime uppercase shadow-[0_0_20px_rgba(182,255,46,0.15)]">
          <Sparkle size={13} weight="fill" className="text-brand-lime animate-pulse" />
          <span>Official League Leadership</span>
        </div>

        {/* Section Heading */}
        <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
          Tournament <span className="brand-text-gradient">Organizers</span>
        </h2>

        {/* Clear Subtitle */}
        <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base font-medium leading-relaxed text-zinc-300">
          Official tournament sponsors and authorized coordinators. Contact directly for verified
          player entry support, slot confirmation, and tournament details.
        </p>

        {/* Interactive Organizer Tabs */}
        <div className="mt-6 inline-flex rounded-full border border-white/15 bg-black/50 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          {SLIDES.map((slide, slideIndex) => {
            const active = slideIndex === index;
            return (
              <button
                key={slide.name}
                type="button"
                onClick={() => setIndex(slideIndex)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 ${
                  active
                    ? 'bg-brand-lime text-brand-ink shadow-[0_4px_16px_rgba(182,255,46,0.4)] font-black'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${active ? 'bg-brand-ink' : 'bg-brand-lime/60'}`} />
                <span>{slide.shop} · {slide.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Organizer Photo Card with Subtle Rounded Corners (No outer frame) */}
      <div className="relative mx-auto mt-8 max-w-md">
        <div
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 aspect-[4/5] w-full select-none shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Carousel Slider Track */}
          <div
            className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((slide, slideIndex) => (
              <article
                key={slide.name}
                aria-hidden={slideIndex !== index}
                className="relative h-full w-full shrink-0 select-none overflow-hidden"
              >
                {/* Portrait photo */}
                <img
                  src={slide.photo}
                  alt={`${slide.name} — ${slide.shop}, ${slide.place}`}
                  className="h-full w-full object-cover object-top"
                  draggable={false}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                />

                {/* Gradient Fade for bottom text readability */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/75 to-transparent"
                />

                {/* Bottom Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-5 pb-6 pt-10 text-center">
                  {/* Official Sponsor Logo */}
                  <div className="relative mb-2">
                    <img
                      src={slide.logo}
                      alt={`${slide.shop} logo`}
                      className="h-12 sm:h-14 w-auto max-w-[210px] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
                    />
                  </div>

                  {/* Organizer Full Name */}
                  <h3 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)]">
                    {slide.name}
                  </h3>

                  {/* Shop & Location Badge */}
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-0.5 backdrop-blur-md">
                    <ShieldCheck size={14} weight="fill" className={slide.accent} />
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">
                      {slide.shop} · {slide.place}
                    </span>
                  </div>

                  {/* Action Buttons: Direct Call + Instagram */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <a
                      href={`tel:${slide.phone}`}
                      className="group/call inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-[0_6px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 hover:border-brand-lime hover:bg-brand-lime hover:text-brand-ink hover:shadow-[0_0_25px_rgba(182,255,46,0.6)] active:scale-95"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition-colors group-hover/call:bg-black/15">
                        <PhoneCall size={13} weight="fill" className="text-brand-lime group-hover/call:text-brand-ink" />
                      </span>
                      <span className="tracking-wide">Call: {slide.phone}</span>
                    </a>

                    {slide.instagramUrl && (
                      <a
                        href={slide.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-pink-500/35 bg-pink-950/50 px-3.5 py-2 text-xs sm:text-sm font-bold text-pink-300 shadow-[0_6px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 hover:border-pink-400 hover:bg-pink-900/60 hover:text-white active:scale-95"
                      >
                        <InstagramIcon className="h-3.5 w-3.5 text-pink-400" />
                        <span>{slide.instagramHandle}</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Top Bar Floating Badges */}
          <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4 z-10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 backdrop-blur-md shadow-md">
              <span className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(182,255,46,0.9)]" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white">
                T-KPL Kadapa
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-3 py-1 backdrop-blur-md text-[11px] font-mono font-bold text-zinc-300 shadow-md">
              <span className="text-brand-lime">{index + 1}</span>
              <span className="text-zinc-500">/</span>
              <span>{SLIDES.length}</span>
            </div>
          </div>

          {/* Navigation Arrows (Sides) */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous organizer"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition hover:border-brand-lime hover:bg-brand-lime hover:text-brand-ink active:scale-90"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next organizer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition hover:border-brand-lime hover:bg-brand-lime hover:text-brand-ink active:scale-90"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>

        {/* Carousel Indicator Dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.name}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-8 bg-brand-lime shadow-[0_0_8px_rgba(182,255,46,0.8)]' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
