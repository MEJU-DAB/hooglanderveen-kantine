/**
 * Splitst HTML-content (van Tiptap) of plain-text op blokniveau.
 * Geeft een array van HTML-strings terug, elk passend binnen maxPerPage tekens (tekst zonder tags).
 */
export function splitContent(html: string, maxPerPage: number): string[] {
  if (!html) return [''];

  const textLen = stripTags(html).length;
  if (textLen <= maxPerPage) return [html];

  // Splits in blokken op block-level tags
  const blockRe = /(<(?:p|h[1-6]|blockquote|ul|ol)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|blockquote|ul|ol)>|<hr[^>]*\/?>)/gi;
  const blocks: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = blockRe.exec(html)) !== null) {
    if (m.index > last) blocks.push(html.slice(last, m.index));
    blocks.push(m[0]);
    last = blockRe.lastIndex;
  }
  if (last < html.length) blocks.push(html.slice(last));

  if (blocks.length <= 1) return [html];

  const chunks: string[] = [];
  let current = '';

  for (const block of blocks) {
    const combined = current + block;
    if (current && stripTags(combined).length > maxPerPage) {
      chunks.push(current);
      current = block;
    } else {
      current = combined;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks.length > 1 ? chunks : [html];
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Render plain-text (legacy markdown) of HTML door naar display-HTML */
export function renderContent(content: string): string {
  if (!content) return '';
  // Tiptap HTML begint met een tag
  if (content.trimStart().startsWith('<')) return content;
  // Legacy markdown-achtig formaat
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n{2,}/g, '<br>')
    .replace(/\n/g, '<br>');
}
