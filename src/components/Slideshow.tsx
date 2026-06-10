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

/**
 * Splits alleen als content echt heel lang is — de auto-fit regelt de rest.
 * Splitst op alinea-grenzen, max 3 pagina's.
 */
function splitBericht(b: Bericht): SlideItem[] {
  if (!b.content) return [{ ...b, _page: 1, _pages: 1 }];
  // Standaard: alles op 1 pagina. Auto-fit schaalt tekst naar beschikbare ruimte.
  // Alleen bij écht enorme teksten (> ~1000 woorden) splitsen.
  const maxPerPage = b.image ? 3500 : 6000;
  const chunks = splitContent(b.content, maxPerPage);
  if (chunks.length === 1) return [{ ...b, _page: 1, _pages: 1 }];
  return chunks.map((chunk, i) => ({
    ...b, id: b.id * 10000 + i, content: chunk, _page: i + 1, _pages: chunks.length,
  }));
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
              {/* Pagina-indicator voor gesplitste artikelen */}
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
