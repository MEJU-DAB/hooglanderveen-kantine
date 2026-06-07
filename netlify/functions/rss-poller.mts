/**
 * Netlify Scheduled Function — draait elke 5 minuten.
 * Roept de Next.js /api/rss endpoint aan om de feed te fetchen
 * en nieuwe items aan de inbox toe te voegen.
 */
import type { Config } from '@netlify/functions';

export default async (): Promise<void> => {
  // Netlify zet automatisch de productie-URL in de URL env-var
  const siteUrl = process.env.URL;
  if (!siteUrl) {
    console.error('[rss-poller] Geen URL omgevingsvariabele gevonden');
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/rss`, {
      method: 'POST',
      headers: { 'x-rss-cron': '1' }, // optionele header voor logging
    });
    const data = await res.json() as { added: number; total: number; initialized: boolean };
    console.log(`[rss-poller] ${data.initialized ? 'Geïnitialiseerd' : `${data.added} nieuw`} (${data.total} totaal in feed)`);
  } catch (err) {
    console.error('[rss-poller] Fout bij ophalen feed:', err);
  }
};

export const config: Config = {
  schedule: '*/5 * * * *', // elke 5 minuten
};
