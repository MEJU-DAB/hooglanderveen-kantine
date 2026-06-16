export interface RssItem {
  guid: string;
  title: string;
  content: string;
  link: string;
  pubDate: string;
}

/** Trekt tekst uit een CDATA-blok of gewoon XML-tekst */
function extractText(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i').exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
  if (plain) return plain[1].trim();
  return '';
}

/** Pakt de URL uit <link>https://...</link> of uit het href-attribuut */
function extractLink(itemXml: string): string {
  const m = /<link[^>]*>([^<]+)<\/link>/i.exec(itemXml);
  if (m) return m[1].trim();
  const a = /<link[^>]+href="([^"]+)"/i.exec(itemXml);
  if (a) return a[1].trim();
  return '';
}

/** Zet ruwe RSS-tekst/HTML om naar nette Tiptap-paragraphs */
export function rssToHtml(raw: string): string {
  if (!raw) return '';
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n').trim();

  return text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p}</p>`)
    .join('');
}

/** Detecteert of RSS-content door de feed afgekapt is */
export function isTruncated(content: string): boolean {
  const text = content.replace(/<[^>]+>/g, '').trim();
  return (
    /\.\.\.\s*$/.test(text) ||
    /…\s*$/.test(text) ||
    /Zie voor meer/.test(text) ||
    /voor meer informatie/i.test(text) ||
    /lees verder/i.test(text) ||
    /read more/i.test(text)
  );
}

/**
 * Haalt de volledige berichttekst op van de detailpagina.
 * Strategie (in volgorde):
 *  1. <meta property="og:description"> — snel, geen HTML-parsing nodig
 *  2. <article>-element met <p>-extractie
 *  3. Elementen met bekende content-klassen
 *  4. Heuristiek: alle <p>-elementen met ≥ 80 tekens (werkt voor de meeste CMS'en)
 *
 * Geeft null terug als scrapen mislukt — aanroeper valt dan terug op RSS-content.
 */
export async function scrapeFullContent(url: string, rssText: string): Promise<string | null> {
  if (!url) return null;

  let html: string;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'VVHooglanderveen-Kantine/1.0 (nieuwsscherm; contact julienmeijboom@vvhooglanderveen.nl)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // 1. og:description
  const og = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description');
  if (og) {
    const ogText = og.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    const rssClean = rssText.replace(/<[^>]+>/g, '').trim();
    // Alleen gebruiken als og: substantieel langer is dan de RSS-tekst
    if (ogText.length > rssClean.length + 80) {
      return rssToHtml(ogText);
    }
  }

  // 2. <article> element
  const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  if (articleMatch) {
    const extracted = extractParagraphs(articleMatch[1]);
    if (extracted) return extracted;
  }

  // 3. Bekende content-klassen (WordPress, Sportlink, etc.)
  const contentClasses = [
    'entry-content', 'post-content', 'article-content', 'article-body',
    'news-content', 'bericht-content', 'sv-news__body', 'page-content',
    'main-content', 'text-content', 'rich-text',
  ];
  for (const cls of contentClasses) {
    const re = new RegExp(`<(?:div|section)[^>]+class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)</(?:div|section)>`, 'i');
    const m = re.exec(html);
    if (m) {
      const extracted = extractParagraphs(m[1]);
      if (extracted) return extracted;
    }
  }

  // 4. Heuristiek: pik alle <p>-elementen ≥ 80 tekens die weinig links bevatten.
  //    Dit werkt voor CMS'en zonder semantische containers (zoals vvhooglanderveen.nl).
  const heuristic = extractHeuristicParagraphs(html, rssText);
  if (heuristic) return heuristic;

  return null;
}

/** Trekt de `content`-attribuutwaarde uit een <meta>-tag */
function extractMetaContent(html: string, name: string): string {
  // property="og:description" of name="description"
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']{20,})["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']{20,})["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1].trim();
  }
  return '';
}

/** Extraheert <p>-elementen uit een HTML-fragment en retourneert Tiptap-HTML */
function extractParagraphs(fragment: string): string {
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim();
    if (text.length >= 40) paragraphs.push(text);
  }
  if (paragraphs.length === 0) return '';
  return paragraphs.map(p => `<p>${p}</p>`).join('');
}

/**
 * Heuristiek voor pagina's zonder semantische containers.
 * Pakt alle <p>-elementen van de pagina, filtert navigatie-achtige regels weg,
 * en behoudt blokken die lijken op nieuwstekst.
 */
function extractHeuristicParagraphs(html: string, rssText: string): string {
  const rssClean = rssText.replace(/<[^>]+>/g, '').trim().toLowerCase();
  // Strip <script>, <style>, <nav>, <header>, <footer> eerst
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(stripped)) !== null) {
    const raw = m[1];
    // Sla over als er te veel links in zitten (navigatie-indicator)
    const linkCount = (raw.match(/<a\s/gi) || []).length;
    const text = raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ').trim();

    if (text.length < 80) continue;           // te kort voor berichttekst
    if (linkCount > 2) continue;              // waarschijnlijk navigatie
    if (text.split(' ').length < 8) continue; // te weinig woorden

    paragraphs.push(text);
  }

  if (paragraphs.length === 0) return '';

  // Gooi paragrafen weg die al in de RSS-tekst staan (vermijd duplicatie)
  const unique = paragraphs.filter(p => {
    const pLow = p.toLowerCase().slice(0, 80);
    return !rssClean.includes(pLow.slice(0, 60));
  });

  // Als er niets unieks over is, gebruik alle paragrafen (RSS was al compleet)
  const result = unique.length > 0 ? unique : paragraphs;
  return result.map(p => `<p>${p}</p>`).join('');
}

/** Parst een RSS/Atom XML-string naar een array van items */
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const chunk = m[1];

    const rawContent =
      extractText(chunk, 'content:encoded') ||
      extractText(chunk, 'description');

    const rawTitle = extractText(chunk, 'title');
    const link     = extractLink(chunk);
    const guid     = extractText(chunk, 'guid') || link;
    const pubDate  = extractText(chunk, 'pubDate') || extractText(chunk, 'dc:date') || '';

    if (!guid) continue;

    items.push({
      guid,
      title:   rawTitle,
      content: rssToHtml(rawContent),
      link,
      pubDate,
    });
  }

  return items;
}
