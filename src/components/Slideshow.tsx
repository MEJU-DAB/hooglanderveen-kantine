'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bericht } from '@/lib/types';

const SLIDE_MS = 10000;

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('nl-NL', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  } catch { return s; }
}

function fmtTime() {
  return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function catLabel(c: string) {
  return ({ nieuws: 'Nieuws', wedstrijd: 'Wedstrijd', selectie: 'Selectie', jeugd: 'Jeugd', overig: 'Overig' } as Record<string, string>)[c] ?? c;
}

function catIcon(c: string) {
  return ({ nieuws: '📰', wedstrijd: '⚽', selectie: '🏆', jeugd: '🌱', overig: '📌' } as Record<string, string>)[c] ?? '📌';
}

function renderText(t: string) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/** Kies headline-grootte op basis van aantal tekens */
function headlineSize(title: string, hasImage: boolean): string {
  const len = title.length;
  if (hasImage) return len < 30 ? 'size-lg' : len < 60 ? 'size-md' : 'size-sm';
  return len < 20 ? 'size-xl' : len < 40 ? 'size-lg' : len < 70 ? 'size-md' : 'size-sm';
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
  const [barWidth, setBarWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = berichten.filter(b => b.active);

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

  const startBar = useCallback(() => {
    setBarWidth(0);
    setTimeout(() => setBarWidth(100), 50);
  }, []);

  useEffect(() => {
    if (active.length === 0) return;
    startBar();
    timerRef.current = setTimeout(function tick() {
      setCurrent(c => (c + 1) % active.length);
      startBar();
      timerRef.current = setTimeout(tick, SLIDE_MS);
    }, SLIDE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length]);

  useEffect(() => {
    if (current >= active.length && active.length > 0) setCurrent(0);
  }, [active.length, current]);

  const dateStr = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const Header = () => (
    <div className="slide-header">
      <div className="header-left">
        <Image src="/logo.png" alt="VV Hooglanderveen" width={54} height={54} className="club-logo" priority />
        <div>
          <div className="header-club-name">VV <span>Hooglanderveen</span></div>
          <div className="header-club-sub">Kantine Nieuws</div>
        </div>
      </div>
      <div className="header-right">
        <span className="slide-date-header">{dateStr}</span>
        <ClockWidget />
      </div>
    </div>
  );

  if (active.length === 0) {
    return (
      <div className="slideshow-root">
        <div className="slide active">
          <Header />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-slide">
              <div className="empty-icon">⚽</div>
              <p>Geen berichten</p>
            </div>
          </div>
          <div className="slide-footer" />
        </div>
      </div>
    );
  }

  const idx = current % active.length;

  return (
    <div className="slideshow-root">
      {/* Progress bar */}
      <div
        className="progress-bar"
        style={{
          width: `${barWidth}%`,
          transition: barWidth === 100 ? `width ${SLIDE_MS}ms linear` : 'none',
        }}
      />

      {active.map((b, i) => (
        <div key={b.id} className={`slide${i === idx ? ' active' : ''}`}>
          <Header />

          <div className={`slide-body${b.image ? ' has-image' : ''}`}>
            <div className="slide-body-text">

              {/* Categorie badge */}
              <div className="slide-cat-wrap">
                <span>{catIcon(b.category)}</span>
                {catLabel(b.category)}
              </div>

              {/* Headline — schaalbaar */}
              <div
                className={`slide-headline ${headlineSize(b.title, !!b.image)}`}
                dangerouslySetInnerHTML={{ __html: renderText(b.title) }}
              />

              {/* Gele balk */}
              <div className="slide-divider" />

              {/* Body tekst */}
              {b.content && (
                <div
                  className="slide-content"
                  dangerouslySetInnerHTML={{ __html: renderText(b.content) }}
                />
              )}

              {/* Datum */}
              <div className="slide-date-tag">{fmtDate(b.created_at)}</div>
            </div>

            {/* Afbeelding */}
            {b.image && (
              <div className="slide-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.title} />
              </div>
            )}
          </div>

          <div className="slide-footer">
            <div className="slide-dots">
              {active.map((_, di) => (
                <div key={di} className={`dot${di === i ? ' active' : ''}`} />
              ))}
            </div>
            <div className="slide-counter">
              <span className="cur-num">{i + 1}</span>
              <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>
              {active.length}
            </div>
          </div>
        </div>
      ))}

      <div className="admin-hint">
        <Link href="/beheer">⚙ beheer</Link>
      </div>
    </div>
  );
}
