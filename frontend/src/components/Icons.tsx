import React from 'react';
import {
  Globe,
  Link2,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Search,
  Sparkles,
  Megaphone,
  Share2,
  PlayCircle,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { BRAND_PATHS } from './brandPaths';

function BrandSvg({ d, fill }: { d: string; fill: string }) {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function TallyLogo({ size = 28 }: { size?: number }) {
  return <img src="/tally.svg" width={size} height={size} className="shrink-0" alt="" />;
}

const siteIcons: Record<string, string> = {
  jrUXdujT: '/site-icons/lootprism.svg',
  SDiPdwJe: '/site-icons/poe-atlas-planner.png',
};

export function SiteBadgeIcon({ siteId, name, size = 22 }: { siteId: string; name: string; size?: number }) {
  const src = siteIcons[siteId];
  if (src) return <img src={src} width={size} height={size} className="shrink-0 object-contain" alt="" />;
  const initial = (name || 'T').trim().charAt(0).toUpperCase() || 'T';
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#6875f5] to-[#4f46e5] text-[11px] font-bold text-white shadow-xs select-none"
    >
      {initial}
    </span>
  );
}

export function SourceIcon({ source }: { source: string }) {
  const s = (source || '').toLowerCase();

  // Direct / None
  if (!s || s === '(direct)' || s === '(none)' || s.includes('direct')) {
    return <Link2 className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.9} />;
  }

  // --- AI / GEO Answer Engines (Official Brand SVGs) ---
  if (s.includes('chatgpt') || s.includes('openai')) {
    return <BrandSvg d={BRAND_PATHS.openai} fill="#18181b" />;
  }
  if (s.includes('perplexity')) {
    return <BrandSvg d={BRAND_PATHS.perplexity} fill="#1FB8CD" />;
  }
  if (s.includes('claude') || s.includes('anthropic')) {
    return <BrandSvg d={BRAND_PATHS.claude} fill="#D97757" />;
  }
  if (s.includes('gemini')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="gemini-brand-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="55%" stopColor="#9B72CB" />
            <stop offset="100%" stopColor="#D96570" />
          </linearGradient>
        </defs>
        <path d={BRAND_PATHS.gemini} fill="url(#gemini-brand-grad)" />
      </svg>
    );
  }
  if (s.includes('deepseek')) {
    return <BrandSvg d={BRAND_PATHS.deepseek} fill="#4D6BFE" />;
  }
  if (s.includes('copilot')) {
    return <BrandSvg d={BRAND_PATHS.copilot} fill="#0F172A" />;
  }
  if (s.includes('grok')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" stroke="#18181b" strokeWidth="2.1" />
        <path d="M7.5 16.5L17 7" stroke="#18181b" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (s.includes('kimi') || s.includes('moonshot')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" rx="5.5" fill="#18181b" />
        <path d="M7.5 6.5v11M16 6.5l-5.8 5.5L16.5 17.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17.2" cy="6.8" r="1.5" fill="#60a5fa" />
      </svg>
    );
  }

  // --- SEO Search Engines (Official Brand SVGs) ---
  if (s.includes('google')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-1 2.3-2.1 3v2.5h3.4c2-1.8 3-4.5 3-7.3z" />
        <path fill="#34A853" d="M12 22c2.8 0 5.1-.9 6.8-2.5l-3.4-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.8v2.6C4.5 19.7 8 22 12 22z" />
        <path fill="#FBBC05" d="M6.3 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H2.8C2.1 9 1.7 10.4 1.7 12s.4 3 1.1 4.4l3.5-2.6z" />
        <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17.1 3 14.8 2 12 2 8 2 4.5 4.3 2.8 7.6l3.5 2.6C7.1 7.8 9.4 6 12 6z" />
      </svg>
    );
  }
  if (s.includes('bing')) {
    return <BrandSvg d={BRAND_PATHS.bing} fill="#008373" />;
  }
  if (s.includes('baidu')) {
    return <BrandSvg d={BRAND_PATHS.baidu} fill="#2932E1" />;
  }
  if (s.includes('duckduckgo')) {
    return <BrandSvg d={BRAND_PATHS.duckduckgo} fill="#DE5833" />;
  }
  if (s.includes('yahoo')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="5" fill="#6001D2" />
        <path d="M6.2 7.5h2.6l2.4 4.9 2.4-4.9h2.5l-3.8 7.2v3.3h-2.3v-3.3L6.2 7.5zm10.6 7.5h2v2.4h-2V15zm.2-7.5h1.8l-.3 6.2h-1.2l-.3-6.2z" fill="#ffffff" />
      </svg>
    );
  }
  if (s.includes('yandex')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#FC3F1D" />
        <path d="M13.6 6.2h-1.5c-2.3 0-3.7 1.3-3.7 3.4 0 1.6.8 2.6 2.3 3.3l-2.6 5h2.2l2.4-4.7h.9v4.7h1.9V6.2h-1.9zm0 5.4h-.8c-1.3 0-2.2-.7-2.2-2s.8-2 2.1-2h.9v4z" fill="#ffffff" />
      </svg>
    );
  }
  if (s.includes('brave')) {
    return <BrandSvg d={BRAND_PATHS.brave} fill="#FB542B" />;
  }

  // --- Social, Video & Tech Platforms (Official Brand SVGs) ---
  if (s.includes('github')) {
    return <BrandSvg d={BRAND_PATHS.github} fill="#181717" />;
  }
  if (s.includes('twitter') || s === 't.co' || s === 'x.com') {
    return <BrandSvg d={BRAND_PATHS.x} fill="#18181b" />;
  }
  if (s.includes('youtube')) {
    return <BrandSvg d={BRAND_PATHS.youtube} fill="#FF0000" />;
  }
  if (s.includes('reddit')) {
    return <BrandSvg d={BRAND_PATHS.reddit} fill="#FF4500" />;
  }
  if (s.includes('linkedin')) {
    return <BrandSvg d={BRAND_PATHS.linkedin} fill="#0A66C2" />;
  }
  if (s.includes('facebook') || s === 'fb.com') {
    return <BrandSvg d={BRAND_PATHS.facebook} fill="#0866FF" />;
  }
  if (s.includes('producthunt')) {
    return <BrandSvg d={BRAND_PATHS.producthunt} fill="#DA552F" />;
  }
  if (s.includes('zhihu')) {
    return <BrandSvg d={BRAND_PATHS.zhihu} fill="#0084FF" />;
  }
  if (s.includes('ycombinator') || s.includes('hacker news')) {
    return <BrandSvg d={BRAND_PATHS.ycombinator} fill="#F0652F" />;
  }

  // Deterministic colored dot fallback for custom domains
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
  const bg = palette[Math.abs(hash) % palette.length];
  return (
    <span
      style={{ backgroundColor: bg }}
      className="w-4 h-4 rounded-full text-white text-[9px] font-semibold inline-flex items-center justify-center shrink-0 uppercase"
    >
      {s.charAt(0)}
    </span>
  );
}

export function ChannelIcon({ channel }: { channel: string }) {
  const c = (channel || '').toLowerCase();
  if (c === 'organic_search') return <Search className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />;
  if (c === 'ai') return <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" strokeWidth={2} />;
  if (c === 'paid_search' || c === 'paid_social') return <Megaphone className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.9} />;
  if (c === 'organic_social') return <Share2 className="w-4 h-4 text-sky-600 shrink-0" strokeWidth={1.9} />;
  if (c === 'video') return <PlayCircle className="w-4 h-4 text-rose-500 shrink-0" strokeWidth={1.9} />;
  if (c === 'email') return <Mail className="w-4 h-4 text-violet-500 shrink-0" strokeWidth={1.9} />;
  if (c === 'referral') return <ExternalLink className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.9} />;
  return <Link2 className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.9} />;
}

export function BrowserIcon({ browser }: { browser: string }) {
  const b = (browser || '').toLowerCase();
  if (b.includes('chrome')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#EA4335" />
        <path d="M12 12L20.7 17A10 10 0 0 1 12 22Z" fill="#34A853" />
        <path d="M12 12L21.5 9A10 10 0 0 1 20.7 17Z" fill="#FBBC05" />
        <path d="M12 12L12 22A10 10 0 0 1 3.3 7Z" fill="#34A853" />
        <circle cx="12" cy="12" r="4.6" fill="#fff" />
        <circle cx="12" cy="12" r="3.4" fill="#4285F4" />
      </svg>
    );
  }
  if (b.includes('safari')) {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="safari-grad" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10.5" fill="url(#safari-grad)" />
        <polygon points="12,12 17,7 14,14" fill="#ef4444" />
        <polygon points="12,12 7,17 10,10" fill="#ffffff" />
        <circle cx="12" cy="12" r="1.2" fill="#e2e8f0" />
      </svg>
    );
  }
  if (b.includes('firefox')) {
    return <BrandSvg d={BRAND_PATHS.firefox} fill="#FF7139" />;
  }
  if (b.includes('edge')) {
    return <BrandSvg d={BRAND_PATHS.edge} fill="#0078D7" />;
  }
  if (b.includes('brave')) {
    return <BrandSvg d={BRAND_PATHS.brave} fill="#FB542B" />;
  }
  if (b.includes('opera')) {
    return <BrandSvg d={BRAND_PATHS.opera} fill="#FF1B2D" />;
  }
  return <Globe className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.8} />;
}

export function DeviceIcon({ device }: { device: string }) {
  const d = (device || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone')) return <Smartphone className="w-4 h-4 text-zinc-500 shrink-0" />;
  if (d.includes('tablet')) return <Tablet className="w-4 h-4 text-zinc-500 shrink-0" />;
  if (d.includes('laptop')) return <Laptop className="w-4 h-4 text-zinc-500 shrink-0" />;
  return <Monitor className="w-4 h-4 text-zinc-500 shrink-0" />;
}
