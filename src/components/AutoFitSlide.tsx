'use client';

import { useLayoutEffect, useRef } from 'react';
import { renderContent } from '@/lib/splitContent';

export interface AutoFitSlideProps {
  title: string;
  content: string;
  image: string | null;
  fontSizeOverride?: number; // rem, 0 = auto-fit
}

/**
 * Rendert titel + body met twee onafhankelijke binary searches.
 * Als fontSizeOverride > 0 wordt die waarde gebruikt voor de bodytekst
 * (titel blijft altijd auto-fit zodat hij nooit afgeknipte regels heeft).
 */
export function AutoFitSlide({ title, content, image, fontSizeOverride = 0 }: AutoFitSlideProps) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLDivElement>(null);
  const gapRef     = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const MAX_TITLE = image ? 3.5 : 7;
  const MIN_TITLE = 1.4;
  const MAX_BODY  = image ? 2.2 : 3.5;
  const MIN_BODY  = 0.95;

  useLayoutEffect(() => {
    const wrap    = wrapRef.current;
    const titleEl = titleRef.current;
    const gapEl   = gapRef.current;
    const bodyEl  = contentRef.current;
    if (!wrap || !titleEl) return;

    const avail = wrap.clientHeight;
    if (avail <= 0) return;

    // ── Stap 1: titelgrootte ─────────────────────────────────────────────
    const titleMaxLines = content ? 2.4 : 10;
    let tlo = MIN_TITLE, thi = MAX_TITLE;
    for (let i = 0; i < 14; i++) {
      const mid = (tlo + thi) / 2;
      titleEl.style.fontSize = `${mid}rem`;
      const oneLinePx = mid * 16 * 0.9;
      if (titleEl.scrollHeight <= oneLinePx * titleMaxLines + 4) tlo = mid; else thi = mid;
    }
    titleEl.style.fontSize = `${tlo}rem`;

    // ── Stap 2: bodytekstgrootte ─────────────────────────────────────────
    if (bodyEl) {
      const titleH    = titleEl.getBoundingClientRect().height;
      const gapH      = gapEl ? gapEl.getBoundingClientRect().height : 18;
      const remaining = avail - titleH - gapH - 4;

      if (fontSizeOverride > 0) {
        bodyEl.style.fontSize = `${fontSizeOverride}rem`;
      } else {
        let blo = MIN_BODY, bhi = MAX_BODY;
        for (let i = 0; i < 14; i++) {
          const mid = (blo + bhi) / 2;
          bodyEl.style.fontSize = `${mid}rem`;
          if (bodyEl.scrollHeight <= remaining) blo = mid; else bhi = mid;
        }
        bodyEl.style.fontSize = `${blo}rem`;
      }
    }
  }, [title, content, image, fontSizeOverride, MAX_TITLE, MAX_BODY, MIN_TITLE, MIN_BODY]);

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
