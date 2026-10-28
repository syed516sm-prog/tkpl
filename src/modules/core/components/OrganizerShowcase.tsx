import React, { useEffect, useState, useRef } from 'react';
import { CaretLeft, CaretRight, PhoneCall } from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';

interface OrganizerSlide {
  name: string;
  shop: string;
  place: string;
  phone: string;
  photo: string;
  logo: string;
  accent: string;
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
  },
  {
    name: 'Sunil',
    shop: 'NR Sports',
    place: 'Vempalli',
    phone: '8919155512',
    photo: '/assets/organizer-sunil.jpeg',
    logo: '/assets/nr-sports-logo.webp',
    accent: 'text-brand-lime',
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
      className="relative border-b border-brand-line/70 bg-brand-ink py-8 sm:py-12 px-4 sm:px-6"
    >
      <div className="mx-auto max-w-lg">
        {/* Instagram Post Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-brand-muted">
              Official Leadership
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
              Tournament Organizers
            </h2>
          </div>

          {/* Quick Switcher Tabs */}
          <div className="flex rounded-full border border-brand-line bg-brand-surface p-1 shadow-inner">
            {SLIDES.map((slide, slideIndex) => {
              const active = slideIndex === index;
              return (
                <button
                  key={slide.name}
                  type="button"
                  onClick={() => setIndex(slideIndex)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    active
                      ? 'bg-brand-lime text-brand-ink shadow-md font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{slide.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Instagram Feed Card (Exact 4:5 Portrait ratio, preventing awkward cropping) */}
        <div
          className="group relative overflow-hidden rounded-3xl border border-brand-line bg-zinc-950 shadow-2xl aspect-[4/5] w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Carousel Track */}
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
                {/* Full portrait photo with clean top alignment */}
                <img
                  src={slide.photo}
                  alt={`${slide.name} — ${slide.shop}, ${slide.place}`}
                  className="h-full w-full object-cover object-top"
                  draggable={false}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                />

                {/* Soft natural gradient fade for text legibility */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/60 to-transparent"
                />

                {/* Floating Content directly on the image with NO box */}
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-4 pb-6 pt-12 text-center">
                  {/* Floating Business Logo (Transparent background, no box) */}
                  <img
                    src={slide.logo}
                    alt={`${slide.shop} logo`}
                    className="h-12 sm:h-14 w-auto max-w-[200px] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.95)]"
                  />

                  {/* Organizer Name directly under the business logo */}
                  <h3 className="mt-2.5 font-display text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                    {slide.name}
                  </h3>

                  {/* Shop & Place */}
                  <p
                    className={`mt-0.5 text-xs font-bold uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] ${slide.accent}`}
                  >
                    {slide.shop} · {slide.place}
                  </p>

                  {/* Mobile number details under the name and shop */}
                  <a
                    href={`tel:${slide.phone}`}
                    className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 font-mono text-xs sm:text-sm font-bold text-white backdrop-blur-md drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)] transition hover:border-brand-lime hover:bg-brand-lime hover:text-brand-ink active:scale-95"
                  >
                    <PhoneCall size={15} weight="fill" />
                    <span>{slide.phone}</span>
                  </a>
                </div>
              </article>
            ))}
          </div>

          {/* Top Bar Floating Badges */}
          <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4 z-10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(182,255,46,0.9)]" />
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white">
                T-KPL Kadapa
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 backdrop-blur-md text-[11px] font-mono font-bold text-zinc-300">
              <span className="text-brand-lime">{index + 1}</span>
              <span className="text-zinc-500">/</span>
              <span>{SLIDES.length}</span>
            </div>
          </div>

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous organizer"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md shadow-lg transition hover:bg-black/90 active:scale-95"
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next organizer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md shadow-lg transition hover:bg-black/90 active:scale-95"
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>

        {/* Story Indicator Dots */}
        <div aria-hidden="true" className="mt-4 flex justify-center gap-2">
          {SLIDES.map((slide, slideIndex) => (
            <button
              key={slide.name}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Go to ${slide.name}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                slideIndex === index ? 'w-8 bg-brand-lime' : 'w-2 bg-white/25 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
