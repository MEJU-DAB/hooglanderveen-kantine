'use client';

import { useLayoutEffect, useRef } from 'react';
import { renderContent } from '@/lib/splitContent';

export interface AutoFitSlideProps {
  title: string;
  content: string;
  image: string | null;
  fontSizeOverride?: number;  // rem, 0 = auto-fit (body)
  titleSizeOverride?: number; // rem, 0 = auto-fit (title)
}

export function AutoFitSlide({ title, content, image, fontSizeOverride = 0, titleSizeOverride = 0 }: AutoFitSlideProps) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLDivElement>(null);
  const gapRef     = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const MAX_TITLE = image ? 3.5 : 7;
  const MIN_TITLE = 1.4;
  const MAX_BODY  = image ? 2.2 : 3.5;
  const MIN_BODY  = 0.95;

  useLayoutEffect(() => {
    const run = () => {
      const wrap    = wrapRef.current;
      const titleEl = titleRef.current;
      const gapEl   = gapRef.current;
      const bodyEl  = contentRef.current;
      if (!wrap || !titleEl) return;

      const avail = wrap.clientHeight;
      if (avail <= 0) return;

      // Gebruik de werkelijke rootfontgrootte (niet hardcoded 16px).
      // Dit is belangrijk als de browser of het OS een andere basisgrootte heeft.
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // line-height van .slide-headline is 0.92 (zie globals.css)
      const HEADLINE_LH = 0.92;

      // ── Stap 1: titelgrootte ───────────────────────────────────────────
      // titleMaxLines: met body-inhoud max 2.4 regels, anders vul scherm
      const titleMaxLines = content ? 2.4 : 10;

      const fitTitle = (lo: number, hi: number) => {
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2;
          titleEl.style.fontSize = `${mid}rem`;
          const oneLinePx = mid * rootPx * HEADLINE_LH;
          if (titleEl.scrollHeight <= oneLinePx * titleMaxLines + 4) lo = mid; else hi = mid;
        }
        titleEl.style.fontSize = `${lo}rem`;
      };

      fitTitle(
        0.5,
        titleSizeOverride > 0 ? titleSizeOverride : MAX_TITLE,
      );

      // ── Stap 2: bodytekstgrootte ───────────────────────────────────────
      if (bodyEl) {
        const titleH    = titleEl.getBoundingClientRect().height;
        const gapH      = gapEl ? gapEl.getBoundingClientRect().height : 18;
        const remaining = avail - titleH - gapH - 16;

        const fitBody = (lo: number, hi: number) => {
          for (let i = 0; i < 14; i++) {
            const mid = (lo + hi) / 2;
            bodyEl.style.fontSize = `${mid}rem`;
            if (bodyEl.scrollHeight <= remaining) lo = mid; else hi = mid;
          }
          bodyEl.style.fontSize = `${lo}rem`;
        };

        fitBody(
          0.5,
          fontSizeOverride > 0 ? fontSizeOverride : MAX_BODY,
        );
      }
    };

    run();

    // Opnieuw meten zodra webfonts geladen zijn (fallback-fonts hebben
    // andere metrics waardoor de eerste meting verkeerd kan zijn).
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(run);
    }
  }, [title, content, image, fontSizeOverride, titleSizeOverride, MAX_TITLE, MAX_BODY]);

  return (
    <div ref={wrapRef} className="slide-text-wrap">
      <div className="slide-body-text">
        <div
          ref={titleRef}
          className="slide-headline"
          dangerouslySetInnerHTML={{ __html: renderContent(title) }}
        />
        <div ref={gapRef} className="slide-title-gap" />
        {content && (
          <div
            ref={contentRef}
            className="slide-content"
            dangerouslySetInnerHTML={{ __html: renderContent(content) }}
          />
        )}
      </div>
    </div>
  );
}
