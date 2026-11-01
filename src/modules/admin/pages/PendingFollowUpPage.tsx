import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  WhatsappLogo,
  PaperPlaneTilt,
  Phone,
  ChatCircleDots,
  CheckCircle,
  Copy,
  ArrowSquareOut,
  ArrowsClockwise,
  MagnifyingGlass,
  WarningCircle,
  X,
  Play,
  SkipForward,
  Check,
  UserCheck,
  ShieldCheck,
  Funnel,
  Sparkle,
} from '@phosphor-icons/react';
import { useTournament } from '../../core/context/TournamentContext';

export interface PendingPlayerItem {
  reg_no: string;
  name: string;
  phone: string;
  town: string;
  role: string;
  reasonKind: 'upi_failed' | 'abandoned';
  reasonText: string;
}

// Active pending players needing follow-up
export const INITIAL_PENDING_PLAYERS: PendingPlayerItem[] = [
  {
    reg_no: 'TKPL-2026-0122',
    name: 'B VINOD KUMAR REDDY',
    phone: '8500849901',
    town: 'Pulivendula',
    role: 'All Rounder',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
  {
    reg_no: 'TKPL-2026-0130',
    name: 'Vulasala Bharath',
    phone: '7995250457',
    town: 'GALIVEEDU',
    role: 'Bowler',
    reasonKind: 'upi_failed',
    reasonText: 'Insufficient bank account balance during UPI attempt',
  },
  {
    reg_no: 'TKPL-2026-0164',
    name: 'Bhanu prakash',
    phone: '9100859612',
    town: 'Kadapa',
    role: 'Wicketkeeper',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
  {
    reg_no: 'TKPL-2026-0212',
    name: 'Rachamallu Mallikarjuna Reddy',
    phone: '9652490435',
    town: 'Vempalli',
    role: 'Wicketkeeper',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
  {
    reg_no: 'TKPL-2026-0223',
    name: 'Sonu akthar',
    phone: '6309928386',
    town: 'Kadapa',
    role: 'Bowler',
    reasonKind: 'upi_failed',
    reasonText: 'UPI app notification timed out / expired',
  },
  {
    reg_no: 'TKPL-2026-0233',
    name: 'Shaik Mohammad',
    phone: '7842625468',
    town: 'Kadapa district Vempalli',
    role: 'All Rounder',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
  {
    reg_no: 'TKPL-2026-0255',
    name: 'M.praveen Kumar reddy',
    phone: '8977575279',
    town: 'Kondur',
    role: 'All Rounder',
    reasonKind: 'abandoned',
    reasonText: 'Registered profile, did not open payment gateway',
  },
  {
    reg_no: 'TKPL-2026-0265',
    name: 'Sunny Sunny',
    phone: '7794932709',
    town: 'Kadapa',
    role: 'Batter',
    reasonKind: 'upi_failed',
    reasonText: 'UPI app notification timed out / expired',
  },
  {
    reg_no: 'TKPL-2026-0266',
    name: 'Venkey',
    phone: '8985969003',
    town: 'Badvel',
    role: 'All Rounder',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
  {
    reg_no: 'TKPL-2026-0285',
    name: 'Shaik Farhan',
    phone: '8019835280',
    town: 'Rayachoty',
    role: 'All Rounder',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
  {
    reg_no: 'TKPL-2026-0289',
    name: 'Moula',
    phone: '9160590577',
    town: 'C.K.DINNE, KADAPA',
    role: 'All Rounder',
    reasonKind: 'abandoned',
    reasonText: 'Payment window opened, exited without paying',
  },
];

type TemplateId = 'smart' | 'friendly' | 'urgent' | 'telugu' | 'custom';

const STORAGE_KEY_SENT = 'tkpl_pending_notifications_sent_v1';

export const PendingFollowUpPage: React.FC<{ isStandalone?: boolean }> = ({ isStandalone = false }) => {
  const { players, payments, adminSession } = useTournament();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upi_failed' | 'abandoned' | 'unsent' | 'sent'>('all');

  // Selected Player Checkboxes
  const [selectedRegs, setSelectedRegs] = useState<Set<string>>(
    () => new Set(INITIAL_PENDING_PLAYERS.map((p) => p.reg_no))
  );

  // Sent Notification Tracking
  const [sentMap, setSentMap] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SENT);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('smart');
  const [customTemplateText, setCustomTemplateText] = useState(
    'Hi {name},\nYour TKPL 2026 registration ({reg_no}) is pending ₹399 payment.\nPlease complete here to secure your auction slot: {link}\n— TKPL Committee'
  );

  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Broadcast Runner Modal State
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);
  const [runnerIndex, setRunnerIndex] = useState(0);

  // Save sentMap to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SENT, JSON.stringify(sentMap));
    } catch {
      // ignore
    }
  }, [sentMap]);

  // Derive dynamic pending players list (if TournamentContext has live records, merge them)
  const pendingPlayers = useMemo(() => {
    // If context players exist, check who is actually unverified
    if (players && players.length > 0 && payments && payments.length > 0) {
      const verifiedPlayerIds = new Set(
        payments.filter((py) => py.status === 'verified').map((py) => py.player_id)
      );
      const verifiedRegNos = new Set(
        payments.filter((py) => py.status === 'verified').map((py) => py.registration_no)
      );

      // Filter context players who are not verified and not withdrawn/rejected
      const unverified = players.filter(
        (p) =>
          !verifiedPlayerIds.has(p.id) &&
          !verifiedRegNos.has(p.registration_no) &&
          p.registration_status !== 'withdrawn' &&
          p.registration_status !== 'rejected'
      );

      if (unverified.length > 0) {
        // Map to our items, preserving known reason text
        const knownMap = new Map(INITIAL_PENDING_PLAYERS.map((p) => [p.reg_no, p]));
        return unverified.map((p) => {
          const known = knownMap.get(p.registration_no);
          return {
            reg_no: p.registration_no,
            name: p.full_name,
            phone: p.phone,
            town: p.locality || 'N/A',
            role: p.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            reasonKind: known ? known.reasonKind : 'abandoned',
            reasonText: known ? known.reasonText : 'Registration submitted, payment pending',
          };
        });
      }
    }
    return INITIAL_PENDING_PLAYERS;
  }, [players, payments]);

  // Filtered List
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingPlayers.filter((p) => {
      // Category filter
      if (filterType === 'upi_failed' && p.reasonKind !== 'upi_failed') return false;
      if (filterType === 'abandoned' && p.reasonKind !== 'abandoned') return false;
      if (filterType === 'unsent' && sentMap[p.reg_no]) return false;
      if (filterType === 'sent' && !sentMap[p.reg_no]) return false;

      // Text search
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.reg_no.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.town.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      );
    });
  }, [pendingPlayers, search, filterType, sentMap]);

  // Selection helpers
  const isAllSelected = filteredPlayers.length > 0 && filteredPlayers.every((p) => selectedRegs.has(p.reg_no));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRegs(new Set());
    } else {
      setSelectedRegs(new Set(filteredPlayers.map((p) => p.reg_no)));
    }
  };

  const toggleSelect = (reg_no: string) => {
    setSelectedRegs((prev) => {
      const next = new Set(prev);
      if (next.has(reg_no)) {
        next.delete(reg_no);
      } else {
        next.add(reg_no);
      }
      return next;
    });
  };

  // Base portal portal link for payment completion
  const portalPaymentLink = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/find-ticket`;
    }
    return 'https://tkpl.vercel.app/find-ticket';
  }, []);

  // Message Generator
  const generateMessage = (player: PendingPlayerItem): string => {
    const link = portalPaymentLink;
    switch (selectedTemplate) {
      case 'smart': {
        if (player.reasonKind === 'upi_failed') {
          return `🏏 *TKPL 2026 Player Registration Notice*\n\nHi *${player.name}*,\n\nWe noticed your recent UPI payment attempt for TKPL Cricket Registration (*${player.reg_no}*) did not go through.\n\nGood news: Your registration slot as *${player.role}* (${player.town}) is still reserved! 🏏\n\nPlease complete your ₹399 registration fee here to confirm your player auction eligibility:\n👉 ${link}\n\nNeed any assistance? Reply directly to this WhatsApp message.\n— *TKPL Organizing Committee*`;
        }
        return `🏏 *TKPL 2026 Player Registration Notice*\n\nHi *${player.name}*,\n\nWe received your player registration for TKPL 2026 (*${player.reg_no}*).\n\nYour registration fee of *₹399* is currently pending. To secure your slot as *${player.role}* and ensure your profile appears in the official Auction Pool, please complete your online payment here:\n👉 ${link}\n\nLooking forward to seeing you on the field!\n— *TKPL Organizing Committee*`;
      }
      case 'friendly':
        return `🏏 *TKPL 2026 - Registration Follow-up*\n\nDear *${player.name}*,\n\nGreetings from the TKPL Committee! Your registration profile (*${player.reg_no}*) for *${player.role}* is waiting for final fee payment (₹399).\n\nPlease complete your payment at the link below to confirm your player auction eligibility:\n👉 *Pay here:* ${link}\n\nBest regards,\n*Team TKPL*`;
      case 'urgent':
        return `⚠️ *URGENT: TKPL 2026 Auction Final Call*\n\nDear *${player.name}* (*${player.reg_no}*),\n\nThe player registration window is closing soon and auction lists are being finalized! Your registration fee of *₹399* is still pending.\n\nPlease clear your fee now to prevent cancellation of your registration:\n👉 ${link}\n\n— *TKPL Organizing Committee*`;
      case 'telugu':
        return `🏏 *TKPL 2026 క్రికెట్ టోర్నమెంట్ రిజిస్ట్రేషన్ ప్రకటన*\n\nనమస్కారం *${player.name}* గారు,\n\nTKPL 2026 లో మీ రిజిస్ట్రేషన్ నంబర్: *${player.reg_no}* (${player.role}, ${player.town}).\nమీ ₹399 రిజిస్ట్రేషన్ ఫీజు పెండింగ్‌లో ఉంది.\n\nఆక్షన్ లిస్ట్‌లో మీ పేరు ఖరారు కావడానికి వెంటనే ఈ క్రింది లింక్ ద్వారా ఫీజు చెల్లించండి:\n👉 ${link}\n\nఏమైనా సందేహాలు ఉంటే ఇక్కడ రిప్లై ఇవ్వండి.\n— *TKPL కమిటీ*`;
      case 'custom':
        return customTemplateText
          .replace(/{name}/g, player.name)
          .replace(/{reg_no}/g, player.reg_no)
          .replace(/{phone}/g, player.phone)
          .replace(/{town}/g, player.town)
          .replace(/{role}/g, player.role)
          .replace(/{amount}/g, '₹399')
          .replace(/{link}/g, link);
      default:
        return '';
    }
  };

  // WhatsApp Action Handlers
  const handleOpenWhatsApp = (player: PendingPlayerItem) => {
    const text = generateMessage(player);
    const cleanPhone = player.phone.replace(/\D/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSentMap((prev) => ({ ...prev, [player.reg_no]: true }));
  };

  const handleMarkSent = (reg_no: string, status: boolean) => {
    setSentMap((prev) => ({ ...prev, [reg_no]: status }));
  };

  // Clipboard Helpers
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      alert('Could not copy to clipboard. Please select and copy manually.');
    }
  };

  const handleCopyNumbers = (delimiter: ',' | '\n') => {
    const selectedList = pendingPlayers.filter((p) => selectedRegs.has(p.reg_no));
    if (selectedList.length === 0) {
      alert('Please select at least one player.');
      return;
    }
    const text = selectedList.map((p) => p.phone.replace(/\D/g, '')).join(delimiter === ',' ? ', ' : '\n');
    copyToClipboard(
      text,
      `Copied ${selectedList.length} phone numbers (${delimiter === ',' ? 'comma-separated' : 'line-by-line'})`
    );
  };

  const handleCopyAllMessages = () => {
    const selectedList = pendingPlayers.filter((p) => selectedRegs.has(p.reg_no));
    if (selectedList.length === 0) {
      alert('Please select at least one player.');
      return;
    }
    const formatted = selectedList
      .map((p, idx) => `=== [${idx + 1}/${selectedList.length}] ${p.name} (${p.phone}) ===\n${generateMessage(p)}\n`)
      .join('\n');
    copyToClipboard(formatted, `Copied all ${selectedList.length} customized messages to clipboard!`);
  };

  // Bulk Auto-Queue Runner
  const runnerQueue = useMemo(
    () => pendingPlayers.filter((p) => selectedRegs.has(p.reg_no)),
    [pendingPlayers, selectedRegs]
  );
  const currentRunnerPlayer = runnerQueue[runnerIndex];

  const handleStartRunner = () => {
    if (runnerQueue.length === 0) {
      alert('Please select at least one player to start the broadcast queue.');
      return;
    }
    setRunnerIndex(0);
    setIsRunnerOpen(true);
  };

  const handleRunnerSendCurrent = () => {
    if (!currentRunnerPlayer) return;
    handleOpenWhatsApp(currentRunnerPlayer);
    if (runnerIndex < runnerQueue.length - 1) {
      setRunnerIndex((prev) => prev + 1);
    } else {
      setIsRunnerOpen(false);
      alert('Broadcast complete! All selected players have been opened in WhatsApp.');
    }
  };

  const handleRunnerSkip = () => {
    if (runnerIndex < runnerQueue.length - 1) {
      setRunnerIndex((prev) => prev + 1);
    } else {
      setIsRunnerOpen(false);
    }
  };

  // Multi-tab staggered sender
  const handleOpenAllTabsStaggered = () => {
    const selectedList = pendingPlayers.filter((p) => selectedRegs.has(p.reg_no));
    if (selectedList.length === 0) {
      alert('Please select at least one player.');
      return;
    }

    const confirmOpen = window.confirm(
      `Open WhatsApp tabs for ${selectedList.length} players?\n\nTip: If your browser blocks pop-ups, please click "Always allow pop-ups from this site".`
    );
    if (!confirmOpen) return;

    selectedList.forEach((player, i) => {
      setTimeout(() => {
        handleOpenWhatsApp(player);
      }, i * 1800); // 1.8s delay between tabs to prevent pop-up blocker
    });
  };

  const sentCount = pendingPlayers.filter((p) => sentMap[p.reg_no]).length;

  return (
    <div className={`space-y-6 ${isStandalone ? 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8' : ''}`}>
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <ChatCircleDots size={16} weight="duotone" />
            <span>Player Communications & Recovery</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-50 flex items-center gap-3">
            <span>Pending Follow-Up Dashboard</span>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-semibold text-amber-400 font-mono">
              {pendingPlayers.length} Pending
            </span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Send personalized WhatsApp notifications to players with failed UPI or abandoned checkouts with 1-click.
          </p>
        </div>

        {/* Action Button: Launch Broadcast Runner */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleStartRunner}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition active:scale-95"
          >
            <PaperPlaneTilt size={18} weight="fill" />
            <span>Launch WhatsApp Broadcast ({selectedRegs.size})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Pending</div>
          <div className="mt-1 text-2xl font-bold text-zinc-100">{pendingPlayers.length} Players</div>
          <div className="text-[11px] text-zinc-500">Unconfirmed registrations</div>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-red-400">UPI Failed</div>
          <div className="mt-1 text-2xl font-bold text-red-300">
            {pendingPlayers.filter((p) => p.reasonKind === 'upi_failed').length} Players
          </div>
          <div className="text-[11px] text-red-400/70">Timed out or insufficient funds</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Checkout Abandoned</div>
          <div className="mt-1 text-2xl font-bold text-amber-300">
            {pendingPlayers.filter((p) => p.reasonKind === 'abandoned').length} Players
          </div>
          <div className="text-[11px] text-amber-400/70">Exited before paying ₹399</div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Recoverable Fees</div>
          <div className="mt-1 text-2xl font-bold text-emerald-300">₹{(pendingPlayers.length * 399).toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400/70">{sentCount} of {pendingPlayers.length} notified</div>
        </div>
      </div>

      {/* Template Selector & Live Preview Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkle size={18} className="text-amber-400" weight="fill" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
              Message Template & Personalization
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Auto-fills player's Name, Reg No, Role, Village & Payment Link
          </span>
        </div>

        {/* Template Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'smart', label: '🤖 Smart Auto-Context', desc: 'Adapts message per failure reason' },
            { id: 'friendly', label: '💬 Friendly English', desc: 'Warm tournament reminder' },
            { id: 'urgent', label: '⚠️ Urgent Auction Cutoff', desc: 'Final call before slot release' },
            { id: 'telugu', label: '🏏 Telugu (తెలుగు)', desc: 'Regional language message' },
            { id: 'custom', label: '✏️ Custom Message', desc: 'Write your own template' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id as TemplateId)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold text-left transition ${
                selectedTemplate === t.id
                  ? 'border border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-sm'
                  : 'border border-zinc-800 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <div className="font-bold">{t.label}</div>
              <div className="text-[10px] text-zinc-400 opacity-80">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom Textarea if Custom is selected */}
        {selectedTemplate === 'custom' && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Tags allowed: <code>{'{name}'}</code>, <code>{'{reg_no}'}</code>, <code>{'{role}'}</code>, <code>{'{town}'}</code>, <code>{'{link}'}</code></span>
            </div>
            <textarea
              rows={4}
              value={customTemplateText}
              onChange={(e) => setCustomTemplateText(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        {/* Message Preview Box */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-900 mb-2">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <WhatsappLogo size={15} className="text-emerald-400" weight="fill" />
              <span>WhatsApp Message Preview (for first selected player):</span>
            </span>
            <span className="text-[11px] text-zinc-500">Includes direct payment lookup link</span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-xs text-emerald-100/90 leading-relaxed bg-zinc-900/60 p-3.5 rounded-lg border border-emerald-950/40">
            {currentRunnerPlayer ? generateMessage(currentRunnerPlayer) : (pendingPlayers[0] ? generateMessage(pendingPlayers[0]) : 'No players')}
          </pre>
        </div>
      </div>

      {/* Toolbar: Multi-Send Actions, Search & Filters */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Multi-Send Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartRunner}
              disabled={selectedRegs.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <PaperPlaneTilt size={15} weight="fill" />
              <span>Broadcast Runner ({selectedRegs.size})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAllTabsStaggered}
              disabled={selectedRegs.size === 0}
              title="Opens a WhatsApp tab for every selected player spaced 2 seconds apart"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition disabled:opacity-50"
            >
              <ArrowSquareOut size={15} />
              <span>Open All in Tabs (Staggered)</span>
            </button>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

            <button
              type="button"
              onClick={() => handleCopyNumbers(',')}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition"
              title="Copy comma-separated phone numbers for SMS gateways or Broadcast lists"
            >
              <Copy size={13} />
              <span>Copy Phone Numbers</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAllMessages}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition"
              title="Copy all formatted messages with player names and links"
            >
              <Copy size={13} />
              <span>Copy All Messages</span>
            </button>
          </div>

          {/* Sent Progress indicator */}
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Progress: <strong className="text-emerald-300">{sentCount}</strong> / {pendingPlayers.length} notified</span>
            {sentCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset notification sent status for all players?')) {
                    setSentMap({});
                  }
                }}
                className="text-[11px] text-zinc-500 hover:text-red-400 underline ml-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by player name, phone, town or reg no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500 mr-1 flex items-center gap-1">
              <Funnel size={13} />
              <span>Filter:</span>
            </span>
            {[
              { id: 'all', label: `All (${pendingPlayers.length})` },
              { id: 'upi_failed', label: `UPI Failed (${pendingPlayers.filter((p) => p.reasonKind === 'upi_failed').length})` },
              { id: 'abandoned', label: `Abandoned (${pendingPlayers.filter((p) => p.reasonKind === 'abandoned').length})` },
              { id: 'unsent', label: `Unsent (${pendingPlayers.filter((p) => !sentMap[p.reg_no]).length})` },
              { id: 'sent', label: `Sent (${pendingPlayers.filter((p) => sentMap[p.reg_no]).length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as typeof filterType)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterType === f.id
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-600'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Feedback Toast */}
        {copyFeedback && (
          <div className="rounded-lg bg-emerald-950/80 border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>{copyFeedback}</span>
          </div>
        )}
      </div>

      {/* Players Follow-Up Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Reg No</th>
                <th className="py-3 px-3">Player Name</th>
                <th className="py-3 px-3">Phone & Direct Contact</th>
                <th className="py-3 px-3">Town / Role</th>
                <th className="py-3 px-3">Follow-Up Reason</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-zinc-500">
                    No pending players found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const isSent = !!sentMap[player.reg_no];
                  const isSelected = selectedRegs.has(player.reg_no);
                  return (
                    <tr
                      key={player.reg_no}
                      className={`hover:bg-zinc-800/40 transition ${
                        isSelected ? 'bg-zinc-800/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(player.reg_no)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Reg No */}
                      <td className="py-3 px-3 font-mono font-bold text-zinc-200">
                        {player.reg_no}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-zinc-100">{player.name}</div>
                      </td>

                      {/* Phone & Direct Contact */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-zinc-300 font-semibold">{player.phone}</span>
                          <a
                            href={`tel:+91${player.phone}`}
                            title="Call Player"
                            className="text-zinc-500 hover:text-zinc-200 transition"
                          >
                            <Phone size={14} />
                          </a>
                        </div>
                      </td>

                      {/* Town & Role */}
                      <td className="py-3 px-3">
                        <div className="text-zinc-300">{player.town}</div>
                        <div className="text-[11px] text-zinc-500 capitalize">{player.role}</div>
                      </td>

                      {/* Reason Badge */}
                      <td className="py-3 px-3">
                        {player.reasonKind === 'upi_failed' ? (
                          <div className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-950/30 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                            <WarningCircle size={12} className="text-red-400" />
                            <span>UPI Failed</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                            <span>Abandoned</span>
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-400 mt-0.5">{player.reasonText}</div>
                      </td>

                      {/* Status Checkbox / Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleMarkSent(player.reg_no, !isSent)}
                          title="Click to toggle notified status"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                            isSent
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {isSent ? <CheckCircle size={12} weight="fill" /> : null}
                          <span>{isSent ? 'Notified' : 'Pending'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(player)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition active:scale-95"
                            title="Open in WhatsApp with prefilled message"
                          >
                            <WhatsappLogo size={15} weight="fill" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                generateMessage(player),
                                `Copied message for ${player.name} to clipboard!`
                              )
                            }
                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition"
                            title="Copy personalized message text"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Runner Modal */}
      {isRunnerOpen && currentRunnerPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <PaperPlaneTilt size={14} weight="fill" />
                  <span>WhatsApp Broadcast Queue</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100">
                  Player {runnerIndex + 1} of {runnerQueue.length}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRunnerOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${((runnerIndex + 1) / runnerQueue.length) * 100}%` }}
              />
            </div>

            {/* Current Player Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-zinc-100">
                    {currentRunnerPlayer.name}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">
                    {currentRunnerPlayer.reg_no} · {currentRunnerPlayer.phone}
                  </div>
                </div>
                <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {currentRunnerPlayer.town} ({currentRunnerPlayer.role})
                </span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                <span className="font-semibold text-zinc-300">Issue:</span>
                <span>{currentRunnerPlayer.reasonText}</span>
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-400">Message to send:</div>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-emerald-200/90 font-mono">
                {generateMessage(currentRunnerPlayer)}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleRunnerSkip}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
              >
                <SkipForward size={14} />
                <span>Skip to Next</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRunnerOpen(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunnerSendCurrent}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/40 transition active:scale-95"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  <span>Send on WhatsApp & Next</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingFollowUpPage;
