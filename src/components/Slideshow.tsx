'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bericht } from '@/lib/types';
import { splitContent } from '@/lib/splitContent';
import { AutoFitSlide } from '@/components/AutoFitSlide';

function fmtTime() {
  return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

interface SlideItem extends Bericht {
  _page: number;
  _pages: number;
}

function splitBericht(b: Bericht): SlideItem[] {
  if (!b.content) return [{ ...b, _page: 1, _pages: 1 }];
  const maxPerPage = b.image ? 3500 : 6000;
  const chunks = splitContent(b.content, maxPerPage);
  if (chunks.length === 1) return [{ ...b, _page: 1, _pages: 1 }];
  return chunks.map((chunk, i) => ({
    ...b, id: b.id * 10000 + i, content: chunk, _page: i + 1, _pages: chunks.length,
  }));
}

/**
 * Genereert @keyframes CSS die bepaalt wanneer elke slide zichtbaar is.
 * Alle slides gebruiken dezelfde animatieduur (som van alle durations).
 * De timing is gecodeerd in de keyframe-percentages per slide — er is
 * geen JS-timer nodig. De compositor thread doet het werk.
 */
function buildKeyframes(slides: SlideItem[]): string {
  if (slides.length === 0) return '';
  if (slides.length === 1) {
    return '@keyframes slide-anim-0{0%,100%{opacity:1;transform:translateY(0)}}\n';
  }

  const totalS = slides.reduce((sum, s) => sum + (s.duration ?? 10), 0);
  const fadePct = (0.55 / totalS) * 100; // 0.55s fade uitgedrukt als % van totale cyclus

  const h = 'opacity:0;transform:translateY(14px)';
  const v = 'opacity:1;transform:translateY(0)';

  let css = '';
  let cumulative = 0;

  for (let i = 0; i < slides.length; i++) {
    const dur = slides[i].duration ?? 10;
    const startPct = (cumulative / totalS) * 100;
    const endPct   = ((cumulative + dur) / totalS) * 100;
    const mid      = (startPct + endPct) / 2;

    // Fade-in eindigt op midpoint of na fadePct — wat het eerst komt
    const fadeInEnd    = Math.min(startPct + fadePct, mid);
    // Fade-out begint op midpoint of voor fadePct — wat het laatste komt
    const fadeOutStart = Math.max(endPct - fadePct, mid);

    css += `@keyframes slide-anim-${i}{`;

    if (i === 0) {
      // Eerste slide start direct zichtbaar (naadloze herstart na einde cyclus)
      css += `0%{${v}}`;
    } else {
      css += `0%{${h}}`;
      if (startPct > 0.001) css += `${startPct.toFixed(3)}%{${h}}`;
      css += `${fadeInEnd.toFixed(3)}%{${v}}`;
    }

    if (fadeOutStart > fadeInEnd + 0.01) {
      css += `${fadeOutStart.toFixed(3)}%{${v}}`;
    }

    // Verberg op het einde van het tijdvenster (ook laatste slide, zodat slide 0 naadloos overneemt)
    const endToken = endPct < 99.999 ? `${endPct.toFixed(3)}%` : '100%';
    css += `${endToken}{${h}}`;
    if (endPct < 99.999) css += `100%{${h}}`;

    css += `}\n`;
    cumulative += dur;
  }

  return css;
}

function Ticker({ items }: { items: string[] }) {
  if (items.length < 6) {
    return (
      <div className="slide-footer slide-footer-static">
        <div className="ticker-label"><span>Nieuws</span></div>
        <span className="ticker-welcome">Welkom bij VV Hooglanderveen</span>
      </div>
    );
  }

  const EST_PX_PER_ITEM = 150;
  const singlePx = items.length * EST_PX_PER_ITEM;
  const copies = Math.max(2, Math.ceil(3840 / singlePx));
  const filled = Array.from({ length: copies }, () => items).flat();
  const doubled = [...filled, ...filled];
  const duration = Math.max(90, Math.min(300, filled.length * 22));
  return (
    <div className="slide-footer">
      <div className="ticker-label"><span>Nieuws</span></div>
      <div className="ticker-scroll-area">
        <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
          {doubled.map((title, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-dot" />
              {title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClockWidget() {
  const [time, setTime] = useState('');
  useEffect(() => {
    setTime(fmtTime());
    const id = setInterval(() => setTime(fmtTime()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="slide-time">{time}</span>;
}

export default function Slideshow({ initialBerichten = [] }: { initialBerichten?: Bericht[] }) {
  const [berichten, setBerichten] = useState<Bericht[]>(initialBerichten);
  const activeRef = useRef<SlideItem[]>([]);

  const active: SlideItem[] = berichten.filter(b => b.active).flatMap(splitBericht);
  activeRef.current = active;
  const tickerItems = active.filter(b => b.ticker && b._page === 1).map(b => b.title);

  const fetchBerichten = useCallback(async () => {
    try {
      const res = await fetch('/api/berichten', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setBerichten(data);
    } catch {}
  }, []);

  useEffect(() => {
    let retryId: ReturnType<typeof setTimeout> | null = null;
    const initial = async () => {
      await fetchBerichten();
      if (activeRef.current.length === 0) {
        retryId = setTimeout(fetchBerichten, 3000);
      }
    };
    initial();
    const id = setInterval(fetchBerichten, 30000);
    return () => {
      clearInterval(id);
      if (retryId) clearTimeout(retryId);
    };
  }, [fetchBerichten]);

  // Injecteer @keyframes in <head> zodra de actieve slideset verandert.
  // De CSS-animatie draait volledig op de compositor thread — onafhankelijk
  // van de JS event loop. Embedded browsers (bijv. Sportlink mediaplayer)
  // die setTimeout throttlen wisselen hierdoor toch gewoon door.
  const activeKey = active.map(s => `${s.id}:${s.duration}`).join(',');
  useEffect(() => {
    if (active.length === 0) return;
    const css = buildKeyframes(active);
    document.getElementById('slideshow-keyframes')?.remove();
    const el = document.createElement('style');
    el.id = 'slideshow-keyframes';
    el.textContent = css;
    document.head.appendChild(el);
    return () => { document.getElementById('slideshow-keyframes')?.remove(); };
  // activeKey is een stabiele string-afleiding van active — veilig als dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const totalS = active.reduce((sum, s) => sum + (s.duration ?? 10), 0);

  // Datum client-side — Vercel draait UTC, browser draait Europe/Amsterdam
  const [dateStr, setDateStr] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleDateString('nl-NL', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    setDateStr(fmt());
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const id = setTimeout(() => setDateStr(fmt()), msUntilMidnight);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="slideshow-root">
      {/* Vaste header */}
      <div className="slide-header">
        <div className="header-logo-block">
          <Image src="/logo.png" alt="VV Hooglanderveen" width={54} height={54} className="club-logo" priority />
          <div className="header-club-name">
            VV Hooglanderveen
            <span>Clubnieuws</span>
          </div>
        </div>
        <div className="header-middle" />
        <div className="header-right">
          <div className="header-divider" />
          <div className="header-time-block">
            <ClockWidget />
            <span className="header-date">{dateStr}</span>
          </div>
        </div>
      </div>

      {/* Wisselende slide-inhoud — animatie volledig via CSS @keyframes */}
      <div className="slides-viewport">
        {active.length === 0 ? (
          <div className="slide-body active">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="empty-slide">
                <div className="empty-icon">⚽</div>
                <p>Geen berichten</p>
              </div>
            </div>
          </div>
        ) : (
          active.map((b, i) => (
            <div
              key={b.id}
              className={`slide-body${b.image ? ' has-image' : ''}`}
              style={{
                animationName: `slide-anim-${i}`,
                animationDuration: `${totalS}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationFillMode: 'both',
              }}
            >
              {b._pages > 1 && (
                <div className="slide-cat-bar">
                  <span className="slide-page-indicator">
                    <span>{b._page}</span> / {b._pages}
                  </span>
                </div>
              )}

              <div className="slide-text-outer">
                <AutoFitSlide
                  title={b.title}
                  content={b.content}
                  image={b.image}
                  fontSizeOverride={b.font_size ?? 0}
                  titleSizeOverride={b.title_size ?? 0}
                />
              </div>

              {b.image && (
                <div className="slide-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image} alt={b.title} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Vaste ticker */}
      <Ticker items={tickerItems} />

      <div className="admin-hint">
        <Link href="/beheer">⚙ beheer</Link>
      </div>
    </div>
  );
}
