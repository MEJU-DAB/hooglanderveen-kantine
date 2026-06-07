'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bericht } from '@/lib/types';
import { splitContent, renderContent, stripTags } from '@/lib/splitContent';

const DEFAULT_SLIDE_MS = 10000;

function fmtTime() {
  return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

interface SlideItem extends Bericht {
  _page: number;
  _pages: number;
}

/**
 * Splits alleen als content echt heel lang is — de auto-fit regelt de rest.
 * Splitst op alinea-grenzen, max 3 pagina's.
 */
function splitBericht(b: Bericht): SlideItem[] {
  if (!b.content) return [{ ...b, _page: 1, _pages: 1 }];
  const maxPerPage = b.image ? 600 : 1200;
  const chunks = splitContent(b.content, maxPerPage);
  if (chunks.length === 1) return [{ ...b, _page: 1, _pages: 1 }];
  return chunks.map((chunk, i) => ({
    ...b, id: b.id * 10000 + i, content: chunk, _page: i + 1, _pages: chunks.length,
  }));
}

/**
 * Auto-fit tekst-component.
 * Render kop + body op max font-size; meet of het in de container past;
 * zoek via binary search naar de grootste font-size die past.
 * Kop en body schalen proportioneel mee.
 */
function AutoFitContent({ b }: { b: SlideItem }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const MIN_HL = 1.2;
  const BODY_RATIO = 0.38;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const avail = wrap.clientHeight;
    if (avail <= 0) return;

    // Schat beschikbare kolombreedte (zonder padding)
    const colW = wrap.clientWidth - 16;
    const titleText = stripTags(b.title) || b.title;
    const charWidthRatio = 0.50;
    const maxForLines = (colW * 1.5) / (Math.max(1, titleText.length) * charWidthRatio) / 16;
    const MAX_HL = Math.min(b.image ? 7 : 18, Math.max(MIN_HL, maxForLines));

    let lo = MIN_HL;
    let hi = MAX_HL;

    const apply = (hl: number) => {
      const bd = Math.max(0.85, hl * BODY_RATIO);
      // Marges op de gele streep: schalen met kopgrootte
      const mg = Math.max(0.35, hl * 0.28);
      text.style.setProperty('--hl', `${hl}rem`);
      text.style.setProperty('--bd', `${bd}rem`);
      text.style.setProperty('--divider-mt', `${mg}rem`);
      text.style.setProperty('--divider-mb', `${mg * 1.4}rem`);
    };

    apply(hi);
    if (text.scrollHeight <= avail) return;

    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      apply(mid);
      if (text.scrollHeight <= avail) lo = mid; else hi = mid;
    }
    apply(lo);
  }, [b.id, b.title, b.content, b.image, BODY_RATIO, MIN_HL]);

  return (
    <div ref={wrapRef} className="slide-text-wrap">
      <div ref={textRef} className="slide-body-text">
        <div
          className="slide-headline"
          style={{ fontSize: 'var(--hl, 4rem)' }}
          dangerouslySetInnerHTML={{ __html: renderContent(b.title) }}
        />
        <div className="slide-divider" />
        {b.content && (
          <div
            className="slide-content"
            style={{ fontSize: 'var(--bd, 1.5rem)' }}
            dangerouslySetInnerHTML={{ __html: renderContent(b.content) }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Ticker — genereert genoeg kopieën om het scherm te vullen zodat er
 * geen zichtbare herhaling is zolang de vorige serie nog in beeld is.
 */
function Ticker({ items }: { items: string[] }) {
  // Minder dan 6 items → stilstaand welkomstbericht
  if (items.length < 6) {
    return (
      <div className="slide-footer slide-footer-static">
        <span className="ticker-welcome">Welkom bij VV Hooglanderveen</span>
      </div>
    );
  }

  const EST_PX_PER_ITEM = 150;
  const singlePx = items.length * EST_PX_PER_ITEM;
  const copies = Math.max(2, Math.ceil(3840 / singlePx));
  const filled = Array.from({ length: copies }, () => items).flat();
  const doubled = [...filled, ...filled];
  const duration = Math.max(40, Math.min(120, filled.length * 10));
  return (
    <div className="slide-footer">
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
        {doubled.map((title, i) => (
          <span key={i} className="ticker-item">
            <span className="ticker-dot" />
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}

function ClockWidget() {
  const [time, setTime] = useState(fmtTime);
  useEffect(() => {
    const id = setInterval(() => setTime(fmtTime()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="slide-time">{time}</span>;
}

export default function Slideshow() {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [current, setCurrent] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRef = useRef(0);
  const activeRef  = useRef<SlideItem[]>([]); // altijd actueel, ook in timer-closure

  const active: SlideItem[] = berichten.filter(b => b.active).flatMap(splitBericht);
  activeRef.current = active; // sync elke render
  const tickerItems = active.filter(b => b.ticker && b._page === 1).map(b => b.title);

  const fetchBerichten = useCallback(async () => {
    try {
      const res = await fetch('/api/berichten', { cache: 'no-store' });
      setBerichten(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchBerichten();
    const id = setInterval(fetchBerichten, 30000);
    return () => clearInterval(id);
  }, [fetchBerichten]);

  const getMs = useCallback(() => {
    const slides = activeRef.current;
    return slides.length > 0
      ? (slides[currentRef.current % slides.length]?.duration ?? 10) * 1000
      : 10000;
  }, []);

  useEffect(() => {
    if (active.length === 0) return;
    currentRef.current = 0;

    const schedule = (delay: number) => {
      timerRef.current = setTimeout(() => {
        const slides = activeRef.current;
        if (slides.length === 0) return;
        const next = (currentRef.current + 1) % slides.length;
        currentRef.current = next;
        setCurrent(next);
        schedule(getMs());
      }, delay);
    };
    schedule(getMs());
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length]);

  useEffect(() => {
    if (current >= active.length && active.length > 0) setCurrent(0);
  }, [active.length, current]);

  const dateStr = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const idx = active.length > 0 ? current % active.length : 0;

  return (
    <div className="slideshow-root">
      {/* Vaste header */}
      <div className="slide-header">
        <div className="header-left">
          <Image src="/logo.png" alt="VV Hooglanderveen" width={54} height={54} className="club-logo" priority />
          <div className="header-club-name">VV <span>Hooglanderveen</span></div>
        </div>
        <div className="header-right">
          <ClockWidget />
          <span className="header-date">{dateStr}</span>
        </div>
      </div>

      {/* Wisselende slide-inhoud */}
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
              className={`slide-body${b.image ? ' has-image' : ''}${i === idx ? ' active' : ''}`}
            >
              <AutoFitContent b={b} />
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
