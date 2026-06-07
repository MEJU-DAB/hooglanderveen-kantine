'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bericht } from '@/lib/types';

const SLIDE_MS = 10000;

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return s;
  }
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

function ClockWidget() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="slide-time">{time}</span>;
}

export default function Slideshow() {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [current, setCurrent] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = berichten.filter(b => b.active);

  const fetchBerichten = useCallback(async () => {
    try {
      const res = await fetch('/api/berichten', { cache: 'no-store' });
      const data = await res.json();
      setBerichten(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBerichten();
    const id = setInterval(fetchBerichten, 30000);
    return () => clearInterval(id);
  }, [fetchBerichten]);

  const startBar = useCallback(() => {
    setBarWidth(0);
    if (barTimerRef.current) clearTimeout(barTimerRef.current);
    if (barAnimRef.current) clearTimeout(barAnimRef.current);
    barTimerRef.current = setTimeout(() => {
      setBarWidth(100);
    }, 50);
  }, []);

  const advance = useCallback(() => {
    setCurrent(c => (c + 1) % Math.max(active.length, 1));
    startBar();
  }, [active.length, startBar]);

  useEffect(() => {
    if (active.length === 0) return;
    startBar();
    timerRef.current = setTimeout(function tick() {
      advance();
      timerRef.current = setTimeout(tick, SLIDE_MS);
    }, SLIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active.length, advance, startBar]);

  // Reset current index if it exceeds active length
  useEffect(() => {
    if (current >= active.length && active.length > 0) setCurrent(0);
  }, [active.length, current]);

  const Logo = () => (
    <svg className="club-logo" viewBox="0 0 60 60" fill="none">
      <path d="M30 2 L55 15 L55 38 Q55 52 30 58 Q5 52 5 38 L5 15 Z" fill="#f5c800" stroke="#0b2d52" strokeWidth="2"/>
      <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fill="#0b2d52" fontSize="18" fontWeight="bold" fontFamily="sans-serif">VV</text>
      <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle" fill="#0b2d52" fontSize="6.5" fontFamily="sans-serif" letterSpacing="0.5">HV</text>
    </svg>
  );

  if (active.length === 0) {
    return (
      <div className="slideshow-root">
        <div className="slide active">
          <div className="slide-header">
            <div className="header-left">
              <Logo />
              <div>
                <div className="header-club-name">VV <span>Hooglanderveen</span></div>
                <div className="header-club-sub">Kantine nieuws</div>
              </div>
            </div>
            <ClockWidget />
          </div>
          <div className="slide-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-slide">
              <div className="empty-icon">⚽</div>
              <p>Geen berichten</p>
              <span>Voeg berichten toe via <Link href="/beheer">/beheer</Link></span>
            </div>
          </div>
          <div className="slide-footer">
            <div className="slide-dots" />
            <div className="slide-counter" />
          </div>
        </div>
      </div>
    );
  }

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

      {active.map((b, i) => {
        const isActive = i === current % active.length;
        return (
          <div key={b.id} className={`slide${isActive ? ' active' : ''}`}>
            <div className="slide-header">
              <div className="header-left">
                <Logo />
                <div>
                  <div className="header-club-name">VV <span>Hooglanderveen</span></div>
                  <div className="header-club-sub">Kantine nieuws</div>
                </div>
              </div>
              <ClockWidget />
            </div>

            <div className={`slide-body${b.image ? ' has-image' : ''}`}>
              <div className="slide-body-text">
                <div className="slide-cat-wrap">
                  <span>{catIcon(b.category)}</span>
                  {catLabel(b.category)}
                </div>
                <div
                  className="slide-headline"
                  dangerouslySetInnerHTML={{ __html: renderText(b.title) }}
                />
                {b.content && (
                  <div
                    className="slide-content"
                    dangerouslySetInnerHTML={{ __html: renderText(b.content) }}
                  />
                )}
                <div className="slide-date-tag">{fmtDate(b.created_at)}</div>
              </div>
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
                <span className="sep">/</span>
                {active.length}
              </div>
            </div>
          </div>
        );
      })}

      <div className="admin-hint" style={{ position: 'fixed', bottom: '1.2rem', right: '1.5rem', zIndex: 50 }}>
        <Link href="/beheer" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: 'rgba(0,0,0,0.25)', textDecoration: 'none' }}>
          ⚙ beheer
        </Link>
      </div>
    </div>
  );
}
