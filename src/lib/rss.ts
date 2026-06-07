export interface RssItem {
  guid: string;
  title: string;
  content: string;
  link: string;
  pubDate: string;
}

/** Trekt tekst uit een CDATA-blok of gewoon XML-tekst */
function extractText(xml: string, tag: string): string {
  // Probeer eerst <tag><![CDATA[...]]></tag>
  const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i').exec(xml);
  if (cdata) return cdata[1].trim();
  // Dan gewoon <tag>...</tag>
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
  if (plain) return plain[1].trim();
  return '';
}

/** Pakt de URL uit <link>https://...</link> of uit het href-attribuut */
function extractLink(itemXml: string): string {
  // WordPress-stijl: <link>url</link>
  const m = /<link[^>]*>([^<]+)<\/link>/i.exec(itemXml);
  if (m) return m[1].trim();
  // Atom-stijl: <link href="url" ... />
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
