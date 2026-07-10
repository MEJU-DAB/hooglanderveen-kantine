# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # development server op http://localhost:3000
npm run build    # productie-build (controleert TypeScript en linting)
npm run lint     # ESLint
```

Er zijn geen geautomatiseerde tests. Verificeer wijzigingen handmatig in de browser.

## Architectuur

Dit is een **kantine nieuwsscherm** voor VV Hooglanderveen. De app heeft twee totaal gescheiden surfaces:

### 1. Nieuwsscherm (`/`)
- **Next.js Server Component**, `export const dynamic = 'force-dynamic'` — geen ISR, geen client-side React, geen hydration.
- Rendert puur HTML. Slide-animaties via `@keyframes` die server-side worden berekend in `buildKeyframes()` en inline als `<style>` meegestuurd.
- Stijlen in `public/slideshow.css`, klok + polling in `public/slideshow.js` (vanilla JS).
- **Poll-mechanisme**: `slideshow.js` pollt elke 60s `/api/berichten?lite=1`. Als `pushedAt` verandert → `window.location.reload()`. Nieuwe berichten verschijnen dus alleen na een expliciete Push vanuit Beheer.

### 2. Beheer (`/beheer`)
- React client component (`'use client'`) in `src/components/Beheer.tsx`.
- Tiptap rich-text editor voor berichtinhoud.
- Drag & drop volgorde via `@hello-pangea/dnd`.
- CSS en Google Fonts worden geladen via `src/app/beheer/layout.tsx` (importeert `globals.css`). De root layout (`src/app/layout.tsx`) laadt geen CSS zodat het nieuwsscherm dit niet meepakt.

### Database
- **Turso** (libSQL/SQLite via edge). Client in `src/lib/db.ts`.
- Schema wordt bij opstart aangemaakt/gemigreerd via `initDb()` — migraties zijn `try/catch ALTER TABLE`-statements.
- Tabellen: `berichten`, `rss_inbox`, `config` (bevat `last_pushed_at`).
- `image`-kolom slaat Cloudinary-URLs op (of legacy base64). Afbeeldingen worden geproxied via `/api/image/[id]` zodat de WebView alleen het eigen domein nodig heeft.

### Cache
`src/lib/cache.ts` — eenvoudige in-memory cache met 60s TTL per serverless instantie. Elke schrijfoperatie (POST/PUT/PATCH/DELETE op berichten, push) roept `invalideerCache()` aan.

**Let op**: Vercel kan meerdere serverless-instanties draaien. Cache-invalidatie op instantie A bereikt instantie B niet — na maximaal 60s is de cache op alle instanties verlopen.

`src/lib/berichtenCache.ts` is de oude versie (nog aanwezig, niet meer gebruikt door `page.tsx` of de berichten-route).

### Auth / Middleware
`src/proxy.ts` is het Next.js middleware-bestand (ongebruikelijke naam). Auth werkt via cookie `beheer_auth` die vergeleken wordt met env `BEHEER_SECRET`.

De middleware draait alleen voor routes in de `matcher`:
- `/beheer/:path*` → redirect naar login als niet geauthenticeerd
- `/api/berichten/:path*` → GET is publiek, mutaties vereisen auth
- `/api/rss/:path*` → vereist auth

Routes buiten de matcher (o.a. `/api/admin/*`, `/api/image/*`) hebben geen middleware maar controleren auth zelf via `requireAuth()`.

### RSS
Vercel cron-job dagelijks om 07:00 op `/api/cron/rss`. Items landen in `rss_inbox`. De admin kan items vanuit de RSS Inbox bewerken en publiceren als bericht.

## Environment Variables

```
TURSO_URL              # libsql://... Turso database URL
TURSO_AUTH_TOKEN       # Turso auth token
BEHEER_SECRET          # Gedeeld geheim voor beheer-sessie (cookie-waarde)
CLOUDINARY_CLOUD_NAME  # Cloudinary upload
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

## Deployment

Vercel. Cron-configuratie staat in `vercel.json`. Statische assets (afbeeldingen, fonts) krijgen een jaar cache via de `headers`-sectie in `vercel.json`.

## Kritische ontwerpkeuzes

- **Nieuwsscherm heeft geen React client runtime** — voeg nooit `'use client'` toe aan `src/app/page.tsx` of componenten die daarin worden gebruikt.
- **`src/proxy.ts` is de middleware** — Next.js verwacht normaal `middleware.ts`, maar hier is het hernoemd. Voeg de export niet toe aan een ander bestand.
- **Slide-CSS keyframes** worden server-side gegenereerd op basis van `b.id` (integer). Animatienamen zijn `s{id}` — dit is bewust (geen XSS-risico, geen conflicten).
- **Ticker-loop**: de items worden 2× gedupliceerd in de HTML. De CSS-animatie gaat van `0` naar `-50%`, wat exact één kopie breed is — dit maakt de naadloze loop.
- **`berichtenCache.ts` en `Slideshow.tsx`** zijn legacy-bestanden die nog niet verwijderd zijn. De nieuwe cache is `src/lib/cache.ts`.
