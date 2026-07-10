import { getCachedFeed } from '@/lib/cache';
import { Bericht } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Bereken @keyframes CSS voor alle slides op de server.
// Slide-namen zijn gebaseerd op bericht-ID (integer) — geen XSS-risico.
function buildKeyframes(slides: Bericht[]): string {
  if (slides.length === 0) return '';
  const totalS = Math.max(1, slides.reduce((s, b) => s + (b.duration ?? 10), 0));
  const FADE_S  = 0.55;
  let css = '';
  let cum = 0;

  for (let i = 0; i < slides.length; i++) {
    const { id, duration = 10 } = slides[i];
    const startPct     = (cum / totalS) * 100;
    const endPct       = ((cum + duration) / totalS) * 100;
    const midPct       = (startPct + endPct) / 2;
    const fadePct      = (FADE_S / totalS) * 100;
    const fadeInEnd    = Math.min(startPct + fadePct, midPct);
    const fadeOutStart = Math.max(endPct - fadePct, midPct);

    const hidden  = 'opacity:0;transform:translateY(14px)';
    const visible = 'opacity:1;transform:translateY(0)';

    css += `@keyframes s${id}{`;
    if (i === 0) {
      css += `0%{${visible}}`;
    } else {
      css += `0%{${hidden}}`;
      if (startPct > 0.001) css += `${startPct.toFixed(2)}%{${hidden}}`;
      css += `${fadeInEnd.toFixed(2)}%{${visible}}`;
    }
    if (fadeOutStart > fadeInEnd + 0.01) {
      css += `${fadeOutStart.toFixed(2)}%{${visible}}`;
    }
    const endToken = endPct < 99.999 ? `${endPct.toFixed(2)}%` : '100%';
    css += `${endToken}{${hidden}}`;
    if (endPct < 99.999) css += `100%{${hidden}}`;
    css += `}\n`;
    cum += duration;
  }
  return css;
}

export default async function Page() {
  const feed = await getCachedFeed();

  const actief = feed.berichten.filter(b =>
    b.active &&
    !b.archived_at &&
    (!b.expires_at || new Date(b.expires_at.replace(' ', 'T')) > new Date())
  );

  const totalS       = Math.max(1, actief.reduce((s, b) => s + (b.duration ?? 10), 0));
  const tickerItems  = actief.filter(b => b.ticker);
  const keyframesCSS = buildKeyframes(actief);

  // Dubbele ticker-items voor naadloze CSS-loop (animatie gaat van 0 naar -50%)
  const tickerDubbl  = [...tickerItems, ...tickerItems];
  const tickerDuur   = Math.max(40, tickerItems.length * 18);

  return (
    <>
      {/* Fonts voor het scherm — apart van beheer om beheer-CSS niet mee te laden */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@700;900&family=Barlow:wght@300;400;600&display=swap"
      />
      <link rel="stylesheet" href="/slideshow.css" />

      {/* Per-slide keyframes: animatienamen zijn s{id} (integer — geen XSS) */}
      {keyframesCSS && (
        // eslint-disable-next-line react/no-danger
        <style dangerouslySetInnerHTML={{ __html: keyframesCSS }} />
      )}

      <div id="scherm">
        <header id="header">
          <div id="header-links">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="VV Hooglanderveen" id="logo" />
            <div id="clubnaam">
              VV Hooglanderveen
              <span>Clubnieuws</span>
            </div>
          </div>
          <div id="header-rechts">
            {/* Klok en datum worden gevuld door slideshow.js */}
            <span id="klok"></span>
            <span id="datum"></span>
          </div>
        </header>

        <div id="slides">
          {actief.length === 0 ? (
            <div className="slide leeg">
              <div className="leeg-icon">⚽</div>
              <p>Geen berichten</p>
            </div>
          ) : actief.map(b => (
            <div
              key={b.id}
              className={`slide${b.image ? ' met-beeld' : ''}`}
              style={{
                animationName:            `s${b.id}`,
                animationDuration:        `${totalS}s`,
                animationTimingFunction:  'linear',
                animationIterationCount:  'infinite',
                animationFillMode:        'both',
              }}
            >
              {b.image && (
                <div className="slide-beeld">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/image/${b.id}`} alt="" loading="eager" />
                </div>
              )}
              <div className="slide-tekst">
                <h1
                  className="slide-titel"
                  style={b.title_size ? { fontSize: `${b.title_size}rem` } : undefined}
                >
                  {b.title}
                </h1>
                {b.content && (
                  <div
                    className="slide-inhoud"
                    style={b.font_size ? {
                      fontSize: `${b.font_size}rem`,
                      WebkitLineClamp: 'unset',
                      overflow: 'visible',
                    } : undefined}
                    // content is Tiptap HTML van de admin — nooit van buitenaf
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: b.content }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {tickerItems.length > 0 ? (
          <footer id="ticker">
            <div id="ticker-label"><span>Nieuws</span></div>
            <div id="ticker-scroll">
              <div
                id="ticker-track"
                style={{
                  animation: `ticker-scroll ${tickerDuur}s linear infinite`,
                }}
              >
                {tickerDubbl.map((b, i) => (
                  <span key={i} className="ticker-item">
                    <span className="ticker-dot">◆</span>
                    {b.title}
                  </span>
                ))}
              </div>
            </div>
          </footer>
        ) : (
          <footer id="ticker" className="ticker-stil">
            <div id="ticker-label"><span>Nieuws</span></div>
            <span id="ticker-welkom">Welkom bij VV Hooglanderveen</span>
          </footer>
        )}
      </div>

      {/* Klok en polling — vanilla JS, geen React */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/slideshow.js"></script>
    </>
  );
}
