'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

  const totalS = Math.max(1, slides.reduce((sum, s) => sum + (s.duration ?? 10), 0));
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
  if (items.length === 0) {
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
  const duration = Math.max(40, Math.min(300, filled.length * 12));
  return (
    <div className="slide-footer">
      <div className="ticker-label"><span>Nieuws</span></div>
      <div className="ticker-scroll-area">
        {/*
          Alle animation-* properties staan inline zodat de CSS-shorthand
          in globals.css (.ticker-track { animation: ticker-scroll 30s ... })
          geen conflict oplevert in embedded browsers (Sportlink WebView).
          Inline styles winnen altijd van stylesheet-regels.
        */}
        <div
          className="ticker-track"
          style={{
            animationName: 'ticker-scroll',
            animationDuration: `${duration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDelay: '0s',
            animationFillMode: 'none',
            animationDirection: 'normal',
            animationPlayState: 'running',
          }}
        >
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

// Lichte fingerprint: alleen velden die de slideshow/ticker beïnvloeden
function fingerprint(bs: Bericht[]): string {
  return bs.map(b =>
    `${b.id}:${b.active ? 1 : 0}:${b.ticker ? 1 : 0}:${b.duration}:${b.sort_order}:${b.title.slice(0, 40)}`,
  ).join('|');
}

export default function Slideshow({
  initialBerichten = [],
  initialPushedAt  = 0,
}: {
  initialBerichten?: Bericht[];
  initialPushedAt?: number;
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(initialBerichten);
  // animationEpoch stijgt bij elke push-reset; verandert de React key op slides
  // zodat ze opnieuw worden gemount en de CSS-animatie herstart vanuit frame 0.
  const [animationEpoch, setAnimationEpoch] = useState(0);
  const berichtenFpRef  = useRef(fingerprint(initialBerichten));
  const lastPushedAtRef = useRef<number>(initialPushedAt);
  const etagRef         = useRef<string>('');
  const activeRef = useRef<SlideItem[]>([]);
  // Lokale image-cache: bewaart image-URLs per bericht-id zodat lite-polls
  // (zonder images) de afbeeldingen niet uit de slideshow laten verdwijnen.
  // Alleen berichten MET een image worden vooraf gevuld — null-waarden worden
  // weggelaten zodat de eerste poll altijd ?images=true ophaalt.
  const imageMapRef = useRef<Map<number, string | null>>(
    new Map(
      initialBerichten
        .filter(b => b.image != null)
        .map(b => [b.id, b.image]),
    ),
  );

  const active: SlideItem[] = useMemo(
    () => berichten.filter(b => b.active).flatMap(splitBericht),
    [berichten],
  );
  activeRef.current = active;
  const tickerItems = useMemo(
    () => active.filter(b => b.ticker && b._page === 1).map(b => b.title),
    [active],
  );

  const applyBerichten = useCallback((data: Bericht[], isPush: boolean) => {
    // Herstel images uit de lokale cache voor lite-responses (image === null)
    const merged = data.map(b => ({
      ...b,
      image: b.image ?? imageMapRef.current.get(b.id) ?? null,
    }));
    // Sla eventuele nieuwe images op in de cache
    merged.forEach(b => { if (b.image) imageMapRef.current.set(b.id, b.image); });

    berichtenFpRef.current = fingerprint(data);
    setBerichten(merged);
    if (isPush) setAnimationEpoch(e => e + 1);
  }, []);

  const fetchBerichten = useCallback(async () => {
    try {
      // Lite-poll: geen base64-afbeeldingen. ETag geeft 304 als data ongewijzigd is.
      const headers: HeadersInit = etagRef.current
        ? { 'If-None-Match': etagRef.current }
        : {};
      const res = await fetch('/api/berichten', { cache: 'no-store', headers });
      if (res.status === 304) return; // niets veranderd — stop hier
      if (!res.ok) return;
      const newEtag = res.headers.get('etag');
      if (newEtag) etagRef.current = newEtag;
      const json = await res.json();
      if (!json || !Array.isArray(json.berichten)) return;

      const { berichten: data, pushedAt }: { berichten: Bericht[]; pushedAt: number } = json;
      const isPush   = pushedAt !== lastPushedAtRef.current;
      const hasNewId = data.some(b => !imageMapRef.current.has(b.id));

      if (isPush || hasNewId) {
        // Bij push of nieuwe berichten: haal images op zodat ze direct zichtbaar zijn.
        lastPushedAtRef.current = pushedAt;
        try {
          const full = await fetch('/api/berichten?images=true', { cache: 'no-store' });
          if (full.ok) {
            const fullJson = await full.json();
            if (Array.isArray(fullJson?.berichten)) {
              fullJson.berichten.forEach((b: Bericht) => {
                if (b.image) imageMapRef.current.set(b.id, b.image);
              });
            }
          }
        } catch {}
        applyBerichten(data, isPush);
      } else {
        // Geen push, geen nieuwe berichten — alleen re-renderen bij gewijzigde data.
        const fp = fingerprint(data);
        if (fp !== berichtenFpRef.current) applyBerichten(data, false);
      }
    } catch {}
  }, [applyBerichten]);

  useEffect(() => {
    let retryId: ReturnType<typeof setTimeout> | null = null;
    const initial = async () => {
      await fetchBerichten();
      if (activeRef.current.length === 0) {
        retryId = setTimeout(fetchBerichten, 3000);
      }
    };
    initial();
    const id = setInterval(fetchBerichten, 120000);

    // Fetch direct bij terugkeer vanuit slaapstand / achtergrondtab.
    // Voorkomt verouderde content na nacht zonder polls.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchBerichten();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      if (retryId) clearTimeout(retryId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchBerichten]);

  // Injecteer @keyframes in <head> zodra de actieve slideset verandert.
  // Bij animationEpoch > 0 (push-reset) wordt de stijl altijd verwijderd en
  // opnieuw aangemaakt zodat de browser alle animatietimers herstart — bewust
  // een CSSOM-invalideringsflits op dat moment, want dat is precies het doel.
  // Bij gewone data-updates wordt textContent in-place bijgewerkt (geen flits).
  const activeKey = active.map(s => `${s.id}:${s.duration}`).join(',');
  const lastCssRef     = useRef('');
  const lastEpochRef   = useRef(0);

  useEffect(() => {
    if (active.length === 0) return;
    const css          = buildKeyframes(active);
    const isPushReset  = animationEpoch !== lastEpochRef.current;
    lastEpochRef.current = animationEpoch;

    if (!isPushReset && css === lastCssRef.current) return; // niets veranderd
    lastCssRef.current = css;

    if (isPushReset) {
      // Verwijder en hermaak → browser herstart alle animatietimers
      document.getElementById('slideshow-keyframes')?.remove();
      const el = document.createElement('style');
      el.id = 'slideshow-keyframes';
      el.textContent = css;
      document.head.appendChild(el);
    } else {
      // Gewone data-update: in-place zodat ticker-animatie niet flikkert
      let el = document.getElementById('slideshow-keyframes') as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement('style');
        el.id = 'slideshow-keyframes';
        document.head.appendChild(el);
      }
      el.textContent = css;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, animationEpoch]);

  // Cleanup alleen bij unmount — NIET bij elke activeKey-wijziging
  useEffect(() => {
    return () => { document.getElementById('slideshow-keyframes')?.remove(); };
  }, []);

  const totalS = Math.max(1, active.reduce((sum, s) => sum + (s.duration ?? 10), 0));

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
              key={`${b.id}-${animationEpoch}`}
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
