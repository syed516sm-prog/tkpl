import React from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * StadiumBackground
 *
 * Immersive Red Cricket Tennis Ball Felt Atmosphere:
 * - Rich Maroon-Red base gradient matching the official "hot tennis ball"
 * - Authentic woolen felt micro-texture (seamless interlocking wool fuzz & fibers)
 * - Iconic curved cricket tennis ball felt seam arcing through the background
 * - Top floodlight towers (Electric Lime & Championship Gold) illuminating the red felt
 * - Drifting atmospheric night stadium sparks and motes
 */
export const StadiumBackground: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#140104]"
    >
      {/* 1. Base Rich Maroon Red Spherical Felt Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_10%,#6d0c17_0%,#4a060f_32%,#2d0309_65%,#150104_100%)]" />

      {/* 2. Seamless Woolen Felt Texture Tile (Dense fuzzy fibers like the tennis ball surface) */}
      <div
        className="absolute inset-0 opacity-60 mix-blend-screen"
        style={{
          backgroundImage: "url('/assets/tennis-ball-felt.webp')",
          backgroundRepeat: 'repeat',
          backgroundSize: '192px 192px',
        }}
      />

      {/* 3. Secondary Micro-Fuzz Detail Layer (Ensures tactile felt depth even on high-DPI screens) */}
      <div
        className="absolute inset-0 opacity-45 mix-blend-overlay"
        style={{
          backgroundImage: "url('/assets/tennis-ball-fuzz-pattern.webp')",
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* 4. Iconic Cricket Tennis Ball Curved Seams */}
      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 1800"
      >
        <defs>
          <filter id="seam-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <linearGradient id="seam-glow-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="seam-glow-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Top-Right to Center-Left Tennis Ball Seam Arc */}
        {/* Soft felt glow */}
        <path
          d="M 1480,120 Q 980,380 720,720 T 60,1400"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="32"
          strokeLinecap="round"
          filter="url(#seam-blur)"
        />
        {/* White felt tape */}
        <path
          d="M 1480,120 Q 980,380 720,720 T 60,1400"
          fill="none"
          stroke="url(#seam-glow-1)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Inner stitch groove */}
        <path
          d="M 1480,120 Q 980,380 720,720 T 60,1400"
          fill="none"
          stroke="rgba(30, 2, 6, 0.45)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />

        {/* Bottom-Right Secondary Ball Seam Arc */}
        <path
          d="M 800,1850 Q 1100,1500 1380,1100"
          fill="none"
          stroke="url(#seam-glow-2)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 800,1850 Q 1100,1500 1380,1100"
          fill="none"
          stroke="rgba(30, 2, 6, 0.45)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />
      </svg>

      {/* 5. Top-Left Floodlight Tower - Electric Lime Spotlight Cluster */}
      <div className="absolute -top-16 -left-16 z-0">
        <div className="absolute top-8 left-8 h-32 w-32 rounded-full bg-brand-lime blur-2xl opacity-65" />
        <div
          className={`h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(182,255,46,0.32)_0%,rgba(16,185,129,0.18)_40%,transparent_70%)] blur-[90px] ${
            reduceMotion ? '' : 'animate-stadium-pulse'
          }`}
        />
        {/* Floodlight Rig Head */}
        <div className="absolute top-10 left-10 flex gap-2 rounded-2xl border border-brand-lime/40 bg-zinc-950/85 p-2 shadow-[0_0_35px_rgba(182,255,46,0.55)] backdrop-blur-md">
          <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_12px_#b6ff2e,0_0_24px_#b6ff2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-brand-lime shadow-[0_0_12px_#b6ff2e,0_0_24px_#b6ff2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_12px_#b6ff2e,0_0_24px_#b6ff2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-brand-lime shadow-[0_0_12px_#b6ff2e,0_0_24px_#b6ff2e]" />
        </div>
      </div>

      {/* 6. Top-Right Floodlight Tower - Warm Golden Stadium Rig */}
      <div className="absolute -top-16 -right-16 z-0">
        <div className="absolute top-8 right-8 h-32 w-32 rounded-full bg-brand-yellow blur-2xl opacity-65" />
        <div
          className={`h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(255,210,30,0.30)_0%,rgba(245,158,11,0.16)_40%,transparent_70%)] blur-[90px] ${
            reduceMotion ? '' : 'animate-stadium-pulse-delayed'
          }`}
        />
        {/* Floodlight Rig Head */}
        <div className="absolute top-10 right-10 flex gap-2 rounded-2xl border border-brand-yellow/40 bg-zinc-950/85 p-2 shadow-[0_0_35px_rgba(255,210,30,0.55)] backdrop-blur-md">
          <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_12px_#ffd21e,0_0_24px_#ffd21e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-brand-yellow shadow-[0_0_12px_#ffd21e,0_0_24px_#ffd21e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_12px_#ffd21e,0_0_24px_#ffd21e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-brand-yellow shadow-[0_0_12px_#ffd21e,0_0_24px_#ffd21e]" />
        </div>
      </div>

      {/* 7. Center Overhead Spotlight Beam across the Red Felt */}
      <div className="absolute -top-20 left-1/2 h-[680px] w-full max-w-4xl -translate-x-1/2 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,100,120,0.20)_0%,rgba(182,255,46,0.14)_45%,transparent_75%)] blur-3xl" />

      {/* 8. Light Shafts Illuminating the Woolen Felt */}
      {!reduceMotion && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="animate-beam-sway absolute -top-12 left-[4%] h-[85vh] w-56 origin-top rotate-[24deg] bg-gradient-to-b from-brand-lime/20 via-emerald-400/8 to-transparent blur-xl"
            style={{ animationDuration: '14s' }}
          />
          <div
            className="animate-beam-sway absolute -top-12 right-[4%] h-[85vh] w-56 origin-top -rotate-[24deg] bg-gradient-to-b from-brand-yellow/20 via-amber-400/8 to-transparent blur-xl"
            style={{ animationDuration: '16s', animationDelay: '-6s' }}
          />
        </div>
      )}

      {/* 9. Mid-Page Felt Highlight Accents */}
      <div className="absolute top-[35%] -left-20 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(225,29,72,0.22)_0%,transparent_70%)] blur-[100px]" />
      <div className="absolute top-[48%] -right-20 h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle,rgba(255,100,120,0.18)_0%,transparent_70%)] blur-[100px]" />

      {/* 10. Bottom Glow & Trophy Ambient Light (behind CTA / Footer) */}
      <div className="absolute bottom-0 left-0 right-0 h-[550px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_70%_at_50%_100%,rgba(182,255,46,0.12)_0%,rgba(225,29,72,0.15)_40%,transparent_80%)] blur-2xl" />
        <div className="absolute bottom-12 left-1/2 h-72 w-[540px] -translate-x-1/2 rounded-full bg-brand-yellow/15 blur-3xl" />
      </div>

      {/* 11. Floating Stadium Sparks / Light motes */}
      {!reduceMotion && (
        <div className="absolute inset-0 overflow-hidden">
          <span className="stadium-mote absolute top-[18%] left-[20%] h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_12px_#b6ff2e]" style={{ animationDuration: '12s' }} />
          <span className="stadium-mote absolute top-[26%] left-[82%] h-2 w-2 rounded-full bg-brand-yellow shadow-[0_0_12px_#ffd21e]" style={{ animationDuration: '15s', animationDelay: '-4s' }} />
          <span className="stadium-mote absolute top-[50%] left-[30%] h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_12px_#fda4af]" style={{ animationDuration: '14s', animationDelay: '-8s' }} />
          <span className="stadium-mote absolute top-[68%] left-[76%] h-2.5 w-2.5 rounded-full bg-brand-lime shadow-[0_0_14px_#b6ff2e]" style={{ animationDuration: '16s', animationDelay: '-2s' }} />
          <span className="stadium-mote absolute top-[84%] left-[22%] h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_#fcd34d]" style={{ animationDuration: '13s', animationDelay: '-10s' }} />
        </div>
      )}

      {/* 12. Subtle Fine Felt Grain Vignette at the very borders */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_55%,rgba(15,1,3,0.7)_100%)]" />
    </div>
  );
};
