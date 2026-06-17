'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TiptapLink from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { Bericht } from '@/lib/types';
import { splitContent, stripTags } from '@/lib/splitContent';
import { AutoFitSlide } from '@/components/AutoFitSlide';

/* ── SVG Icons ── */
const Icons = {
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  ),
  megaphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  ),
  rss: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/>
      <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  ),
  externalLink: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  ),
  grip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  xMark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  spinner: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" opacity=".25"/>
      <path d="M21 12a9 9 0 01-9 9"/>
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  restore: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

/* ── helpers ── */
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return s; }
}

function fmtExpiry(s: string) {
  try {
    const d = new Date(s.replace(' ', 'T'));
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  } catch { return s; }
}

/** Converteert DB-datetime ("2024-06-17 14:30:00") naar datetime-local waarde ("2024-06-17T14:30") */
function toDatetimeLocal(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(' ', 'T').slice(0, 16);
}

/* ── ExpiryBadge ── */
function ExpiryBadge({ expires_at }: { expires_at?: string | null }) {
  if (!expires_at) return null;
  const d = new Date(expires_at.replace(' ', 'T'));
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return null; // al gearchiveerd door API
  const soon = diff < 48 * 60 * 60 * 1000;
  return (
    <span className={`expiry-badge${soon ? ' expiry-soon' : ''}`}>
      Vervalt {fmtExpiry(expires_at)}
    </span>
  );
}

/* ── RSS inbox types ── */
interface RssItem {
  id: number;
  guid: string;
  title: string;
  content: string;
  link: string;
  pub_date: string;
  fetched_at: string;
  status: string;
  bericht_id: number | null;
}

/* ── types ── */
const DEFAULT_DURATION = 10;

interface FormState {
  title: string;
  content: string;
  image: string | null;
  ticker: boolean;
  duration: number;
  font_size: number;
  title_size: number;
  expires_at: string | null;
}
const emptyForm = (): FormState => ({
  title: '', content: '', image: null, ticker: true,
  duration: DEFAULT_DURATION, font_size: 0, title_size: 0, expires_at: null,
});

/* ── Toast ── */
function Toast({ msg, err, show }: { msg: string; err: boolean; show: boolean }) {
  return <div className={`toast${show ? ' show' : ''}${err ? ' err' : ''}`}>{msg}</div>;
}

/* ── Afbeeldingscompressie via Canvas API ── */
async function compressImage(
  file: File
): Promise<{ dataUrl: string; originalKb: number; compressedKb: number }> {
  const originalKb = Math.round(file.size / 1024);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas niet beschikbaar')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      // base64-lengte → bytes: elke 4 base64-chars ≈ 3 bytes
      const b64 = compressed.split(',')[1] ?? '';
      const compressedBytes = Math.round(b64.length * 3 / 4);
      const compressedKb = Math.round(compressedBytes / 1024);

      if (compressedBytes >= file.size) {
        // Gecomprimeerde versie is groter (bijv. kleine PNG) — gebruik origineel
        const reader = new FileReader();
        reader.onload = e => resolve({ dataUrl: e.target!.result as string, originalKb, compressedKb: originalKb });
        reader.onerror = () => reject(new Error('Leesfout'));
        reader.readAsDataURL(file);
      } else {
        resolve({ dataUrl: compressed, originalKb, compressedKb });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Kon afbeelding niet laden')); };
    img.src = objectUrl;
  });
}

/* ── ImageUpload ── */
function ImageUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState<{ originalKb: number; compressedKb: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setError(`Ongeldig formaat (${file.type || 'onbekend'}). Gebruik JPEG, PNG of WebP.`);
      return;
    }
    setCompressing(true);
    try {
      const { dataUrl, originalKb, compressedKb } = await compressImage(file);
      const b64 = dataUrl.split(',')[1] ?? '';
      const bytes = Math.round(b64.length * 3 / 4);
      if (bytes > 2_000_000) {
        setError(`Afbeelding te groot na compressie (${Math.round(bytes / 1024)} KB). Gebruik een kleinere afbeelding.`);
        return;
      }

      // Upload naar Cloudinary; val terug op base64 als dat niet lukt.
      let imageValue = dataUrl;
      try {
        const up = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        });
        if (up.ok) {
          const { url } = await up.json() as { url: string };
          imageValue = url;
        }
      } catch {}

      setSizeInfo({ originalKb, compressedKb });
      onChange(imageValue);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon afbeelding niet verwerken');
    } finally {
      setCompressing(false);
    }
  };

  const fmtKb = (kb: number) => kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

  return (
    <div>
      {error && <div className="img-error">{error}</div>}
      {value ? (
        <div>
          <div className="img-preview-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" />
            <button
              className="img-remove"
              onClick={() => { onChange(null); setSizeInfo(null); setError(null); }}
              type="button"
              aria-label="Afbeelding verwijderen"
            >
              <span className="btn-icon-svg">{Icons.xMark}</span>
            </button>
          </div>
          {sizeInfo && sizeInfo.compressedKb < sizeInfo.originalKb && (
            <div className="img-size-info">
              Gecomprimeerd: {fmtKb(sizeInfo.originalKb)} → {fmtKb(sizeInfo.compressedKb)}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`img-upload-area${compressing ? ' compressing' : ''}`}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => !compressing && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
          {compressing ? (
            <>
              <div className="img-upload-icon">{Icons.spinner}</div>
              <p>Comprimeren…</p>
            </>
          ) : (
            <>
              <div className="img-upload-icon">{Icons.camera}</div>
              <p><strong>Klik</strong> of sleep een afbeelding</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>JPEG · PNG · WebP · max 2 MB na compressie</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tiptap Toolbar ── */
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btn = (
    active: boolean,
    onClick: () => void,
    label: React.ReactNode,
    title: string,
    danger = false
  ) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`tip-btn${active ? ' tip-btn-active' : ''}${danger ? ' tip-btn-danger' : ''}`}
    >
      {label}
    </button>
  );

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="tip-toolbar">
      <div className="tip-group">
        {btn(!editor.can().undo(), () => editor.chain().focus().undo().run(), '↩', 'Ongedaan maken')}
        {btn(!editor.can().redo(), () => editor.chain().focus().redo().run(), '↪', 'Opnieuw')}
      </div>
      <span className="tip-sep" />
      <div className="tip-group">
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', 'Kop 1')}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', 'Kop 2')}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', 'Kop 3')}
      </div>
      <span className="tip-sep" />
      <div className="tip-group">
        {btn(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      <strong>V</strong>, 'Vet')}
        {btn(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    <em>S</em>,         'Cursief')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <u>O</u>,           'Onderstrepen')}
        {btn(editor.isActive('strike'),    () => editor.chain().focus().toggleStrike().run(),    <s>D</s>,           'Doorhalen')}
        {btn(editor.isActive('code'),      () => editor.chain().focus().toggleCode().run(),      <code style={{fontFamily:'monospace'}}>{'<>'}</code>, 'Code')}
      </div>
      <span className="tip-sep" />
      <div className="tip-group">
        {btn(editor.isActive({ textAlign: 'left' }),   () => editor.chain().focus().setTextAlign('left').run(),   '⬅', 'Links')}
        {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), '↔', 'Centreren')}
        {btn(editor.isActive({ textAlign: 'right' }),  () => editor.chain().focus().setTextAlign('right').run(),  '➡', 'Rechts')}
      </div>
      <span className="tip-sep" />
      <div className="tip-group">
        {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  '• Lijst',  'Opsomming')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1. Lijst', 'Genummerd')}
      </div>
      <span className="tip-sep" />
      <div className="tip-group">
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '❝', 'Citaat')}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), '─', 'Lijn')}
        {btn(editor.isActive('link'), setLink, <span className="btn-icon-svg" style={{width:14,height:14}}>{Icons.link}</span>, 'Link invoegen')}
      </div>
      <span className="tip-sep" />
      <div className="tip-group">
        {btn(false, () => editor.chain().focus().clearNodes().unsetAllMarks().run(), 'Opmaak wissen', 'Opmaak verwijderen', true)}
      </div>
    </div>
  );
}

/* ── RichEditor ── */
function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TiptapLink.configure({ openOnClick: false }),
      CharacterCount,
      Placeholder.configure({ placeholder: 'Schrijf hier de tekst van het bericht…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'tip-editor-content' } },
  });

  const chars = editor?.storage.characterCount.characters() ?? 0;
  const words = editor?.storage.characterCount.words() ?? 0;

  return (
    <div className="tip-editor-wrap">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="tip-meta">
        <span>{chars} tekens</span>
        <span>{words} woorden</span>
      </div>
    </div>
  );
}

/* ── Paginaindeling preview ── */
function PaginaPreview({ content, hasImage }: { content: string; hasImage: boolean }) {
  const maxPerPage = hasImage ? 600 : 1200;
  const pages = splitContent(content, maxPerPage);
  const textLen = stripTags(content).length;
  if (!content || textLen === 0) return null;
  return (
    <div className="pagina-preview">
      <div className="pagina-preview-header">
        <span className="pagina-preview-title">Paginaindeling op nieuwsscherm</span>
        <span className={`pagina-count-badge ${pages.length > 1 ? 'multi' : 'single'}`}>
          {pages.length === 1 ? '✓ 1 pagina' : `${pages.length} pagina's`}
        </span>
      </div>
      <div className="pagina-list">
        {pages.map((chunk, i) => (
          <div key={i} className="pagina-item">
            <div className="pagina-item-label">Pagina {i + 1}</div>
            <div className="pagina-item-text" dangerouslySetInnerHTML={{ __html: chunk }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SlidePreviewModal ── */
const PREVIEW_SCALE = 0.5;

function SlidePreviewModal({ title, content, image, fontSizeOverride, titleSizeOverride, onFontSizeChange, onTitleSizeChange, onSave, onClose }: {
  title: string; content: string; image: string | null;
  fontSizeOverride: number; titleSizeOverride: number;
  onFontSizeChange: (v: number) => void; onTitleSizeChange: (v: number) => void;
  onSave: () => void; onClose: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(PREVIEW_SCALE);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    setScale(el.clientWidth / 1920);
  }, []);

  const bodySliderVal  = fontSizeOverride  > 0 ? fontSizeOverride  : 1.5;
  const titleSliderVal = titleSizeOverride > 0 ? titleSizeOverride : 4.0;
  const bodyAuto  = fontSizeOverride  === 0;
  const titleAuto = titleSizeOverride === 0;

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-panel" onClick={e => e.stopPropagation()}>
        <div className="preview-panel-header">
          <span className="preview-panel-title">Schermpreview</span>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Sluiten"><span className="btn-icon-svg">{Icons.xMark}</span></button>
        </div>
        <div ref={stageRef} className="preview-stage" style={{ height: Math.round(1080 * scale) }}>
          <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute' }}>
            <div className="slideshow-root" style={{ width: 1920, height: 1080 }}>
              <div className="slide-header">
                <div className="header-logo-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="VV Hooglanderveen" width={54} height={54} className="club-logo" style={{ objectFit: 'contain' }} />
                  <div className="header-club-name">VV Hooglanderveen<span>Clubnieuws</span></div>
                </div>
                <div className="header-middle" />
                <div className="header-right">
                  <div className="header-divider" />
                  <div className="header-time-block">
                    <span className="slide-time">00:00</span>
                    <span className="header-date">Schermpreview</span>
                  </div>
                </div>
              </div>
              <div className="slides-viewport">
                <div className={`slide-body active${image ? ' has-image' : ''}`}>
                  <div className="slide-text-outer">
                    <AutoFitSlide title={title || '(geen titel)'} content={content} image={image} fontSizeOverride={fontSizeOverride} titleSizeOverride={titleSizeOverride} />
                  </div>
                  {image && (
                    <div className="slide-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt={title} />
                    </div>
                  )}
                </div>
              </div>
              <div className="slide-footer slide-footer-static">
                <div className="ticker-label"><span>Nieuws</span></div>
                <span className="ticker-welcome">Welkom bij VV Hooglanderveen</span>
              </div>
            </div>
          </div>
        </div>
        <div className="preview-controls">
          <div className="preview-controls-row">
            <span className="preview-controls-label">Titelgrootte:</span>
            <button type="button" className={`btn btn-sm${titleAuto ? ' btn-yellow' : ' btn-ghost'}`} onClick={() => onTitleSizeChange(0)}>Auto</button>
            <input type="range" min={1.2} max={8} step={0.1} value={titleSliderVal} onChange={e => onTitleSizeChange(Number(e.target.value))} className="preview-slider" />
            <span className="preview-size-val">{titleAuto ? <em>auto-fit</em> : `${titleSizeOverride.toFixed(1)} rem`}</span>
          </div>
          <div className="preview-controls-row">
            <span className="preview-controls-label">Tekstgrootte:</span>
            <button type="button" className={`btn btn-sm${bodyAuto ? ' btn-yellow' : ' btn-ghost'}`} onClick={() => onFontSizeChange(0)}>Auto</button>
            <input type="range" min={0.9} max={3.5} step={0.05} value={bodySliderVal} onChange={e => onFontSizeChange(Number(e.target.value))} className="preview-slider" />
            <span className="preview-size-val">{bodyAuto ? <em>auto-fit</em> : `${fontSizeOverride.toFixed(2)} rem`}</span>
          </div>
        </div>
        <div className="preview-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Sluiten</button>
          <button type="button" className="btn btn-yellow" onClick={onSave}>Opslaan</button>
        </div>
      </div>
    </div>
  );
}

/* ── BerichtForm ── */
function BerichtForm({ initial, onSave, onCancel, saveLabel = 'Opslaan' }: {
  initial?: FormState;
  onSave: (f: FormState) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm());
  const [saving, setSaving] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFontSize, setPreviewFontSize] = useState(0);
  const [previewTitleSize, setPreviewTitleSize] = useState(0);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const hasContent = stripTags(form.content).length > 0;
  const uid = initial ? 'edit' : 'new';

  return (
    <form onSubmit={handleSubmit} className="bericht-form">

      {/* Titel */}
      <div className="form-section">
        <label htmlFor={`${uid}-title`} className="form-label">Titel <span className="required">*</span></label>
        <input id={`${uid}-title`} className="form-input form-input-lg"
          value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Grote kop op het nieuwsscherm" required />
      </div>

      {/* Tekst */}
      <div className="form-section">
        <label className="form-label" id={`${uid}-content-label`}>Berichttekst</label>
        <RichEditor value={form.content} onChange={v => set('content', v)} />
      </div>

      {/* Preview + paginaindeling */}
      {(form.title || hasContent) && (
        <div className="form-section form-preview-row">
          <button type="button" className="btn btn-blue btn-sm preview-open-btn"
            onClick={() => { setPreviewFontSize(form.font_size); setPreviewTitleSize(form.title_size); setPreviewOpen(true); }}>
            <span className="btn-icon-svg">{Icons.eye}</span>Schermpreview
          </button>
          {hasContent && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPages(p => !p)}>
              {showPages ? '▲ Paginaindeling verbergen' : '▼ Paginaindeling bekijken'}
            </button>
          )}
        </div>
      )}
      {showPages && hasContent && <PaginaPreview content={form.content} hasImage={!!form.image} />}
      {previewOpen && (
        <SlidePreviewModal
          title={form.title} content={form.content} image={form.image}
          fontSizeOverride={previewFontSize} titleSizeOverride={previewTitleSize}
          onFontSizeChange={setPreviewFontSize} onTitleSizeChange={setPreviewTitleSize}
          onSave={() => { set('font_size', previewFontSize); set('title_size', previewTitleSize); setPreviewOpen(false); }}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Afbeelding */}
      <div className="form-section">
        <label className="form-label">Afbeelding</label>
        <ImageUpload value={form.image} onChange={v => set('image', v)} />
      </div>

      {/* Ticker */}
      <div className="form-section">
        <div className="ticker-option">
          <label className="ticker-option-label">
            <input type="checkbox" checked={form.ticker} onChange={e => set('ticker', e.target.checked)} />
            <span className="ticker-option-text">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="btn-icon-svg">{Icons.megaphone}</span>
                Titel meedraaien in de ticker
              </span>
              <span className="ticker-option-sub">Titel verschijnt in de scrollbalk onderaan het scherm</span>
            </span>
          </label>
        </div>
      </div>

      {/* Weergaveduur */}
      <div className="form-section">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="btn-icon-svg" style={{ width: 14, height: 14 }}>{Icons.clock}</span>
          Weergaveduur
        </label>
        <div className="duration-value">
          <input type="number" min={5} max={60} step={1}
            value={form.duration}
            onChange={e => set('duration', Math.min(60, Math.max(5, Number(e.target.value) || DEFAULT_DURATION)))}
            className="duration-input" />
          <span className="duration-unit">seconden</span>
        </div>
        <div className="duration-hint">Standaard: {DEFAULT_DURATION}s · min. 5s · max. 60s</div>
      </div>

      {/* Vervaldatum */}
      <div className="form-section">
        <label htmlFor={`${uid}-expires`} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="btn-icon-svg" style={{ width: 14, height: 14 }}>{Icons.calendar}</span>
          Vervalt op
          <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 2, textTransform: 'none', letterSpacing: 0 }}>
            (optioneel)
          </span>
        </label>
        <input
          id={`${uid}-expires`}
          type="datetime-local"
          className="form-input"
          value={form.expires_at ?? ''}
          onChange={e => set('expires_at', e.target.value || null)}
        />
        {form.expires_at && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 4, alignSelf: 'flex-start' }}
            onClick={() => set('expires_at', null)}>
            Vervaldatum verwijderen
          </button>
        )}
        <div className="expires-hint">
          Na deze datum verdwijnt het bericht automatisch uit de slideshow en gaat het naar het archief.
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-yellow" disabled={saving}>
          <span className="btn-icon-svg">{saving ? Icons.spinner : Icons.check}</span>
          {saving ? 'Opslaan…' : saveLabel}
        </button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuleren</button>}
      </div>
    </form>
  );
}

/* ── EditDrawer ── */
function EditDrawer({ bericht, onSave, onClose }: {
  bericht: Bericht;
  onSave: (f: FormState) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">Bericht bewerken</div>
          <button className="btn-icon drawer-close" onClick={onClose} aria-label="Sluiten"><span className="btn-icon-svg">{Icons.xMark}</span></button>
        </div>
        <div className="drawer-body">
          <BerichtForm
            initial={{
              title: bericht.title,
              content: bericht.content,
              image: bericht.image,
              ticker: bericht.ticker,
              duration: bericht.duration ?? DEFAULT_DURATION,
              font_size: bericht.font_size ?? 0,
              title_size: bericht.title_size ?? 0,
              expires_at: toDatetimeLocal(bericht.expires_at) || null,
            }}
            onSave={onSave}
            onCancel={onClose}
            saveLabel="Wijzigingen opslaan"
          />
        </div>
      </div>
    </>
  );
}

/* ── RSS Inbox ── */
function RssInbox({ onPublished }: { onPublished: () => void }) {
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RssItem | null>(null);
  const [toast, setToast] = useState({ msg: '', err: false, show: false });
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, err = false) => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, err, show: true });
    toastRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  };

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/rss');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {}
  }, []);

  const triggerFetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      await fetch('/api/rss', { method: 'POST' });
      await fetchItems();
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchItems]);

  useEffect(() => {
    triggerFetch();
    const id = setInterval(() => triggerFetch(true), 5 * 60 * 1000);
    return () => { clearInterval(id); if (toastRef.current) clearTimeout(toastRef.current); };
  }, [triggerFetch]);

  const handleReject = async (item: RssItem) => {
    if (!confirm(`"${item.title}" afwijzen? Het komt niet meer terug.`)) return;
    await fetch(`/api/rss/${item.id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== item.id));
    showToast('Afgewezen');
  };

  const handlePublish = async (form: FormState) => {
    if (!editing) return;
    const res = await fetch(`/api/rss/${editing.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category: 'nieuws' }),
    });
    if (!res.ok) { showToast('Fout bij publiceren', true); return; }
    setItems(prev => prev.filter(i => i.id !== editing.id));
    setEditing(null);
    showToast('Gepubliceerd op het nieuwsscherm ✓');
    onPublished();
  };

  if (loading) return (
    <div className="rss-loading">
      <span className="rss-spinner">↻</span> Feed ophalen…
    </div>
  );

  return (
    <div className="rss-inbox-root">
      <div className="dash-topbar">
        <div className="dash-topbar-title">
          RSS Inbox
          {items.length > 0 && <span className="rss-count-badge">{items.length}</span>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => triggerFetch()} disabled={loading}>
          <span className="btn-icon-svg">{Icons.refresh}</span>Vernieuwen
        </button>
      </div>

      {items.length === 0 ? (
        <div className="dash-card">
          <div className="dash-empty">
            <div className="dash-empty-icon">{Icons.inbox}</div>
            <div className="dash-empty-text">
              Geen nieuwe berichten in de feed.<br />
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                Nieuwe artikelen op vvhooglanderveen.nl verschijnen hier automatisch.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="dash-card rss-list">
          {items.map(item => (
            <div key={item.id} className="rss-item">
              <div className="rss-item-meta">
                <span className="rss-item-date">{item.pub_date ? fmtDate(item.pub_date) : 'Onbekende datum'}</span>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" className="rss-item-link">↗ Bekijk op site</a>
                )}
              </div>
              <div className="rss-item-title">{item.title || '(geen titel)'}</div>
              {item.content && (
                <div className="rss-item-preview"
                  dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]+>/g, ' ').slice(0, 200) + (item.content.length > 200 ? '…' : '') }} />
              )}
              <div className="rss-item-actions">
                <button className="btn btn-yellow btn-sm" onClick={() => setEditing(item)}>
                  <span className="btn-icon-svg">{Icons.pencil}</span>Bewerken & publiceren
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleReject(item)} style={{ color: 'var(--red)' }}>
                  Afwijzen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <>
          <div className="drawer-overlay" onClick={() => setEditing(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">Bewerken & publiceren</div>
              <button className="btn-icon drawer-close" onClick={() => setEditing(null)} aria-label="Sluiten"><span className="btn-icon-svg">{Icons.xMark}</span></button>
            </div>
            <div className="drawer-body">
              <div className="rss-source-note">
                <span className="btn-icon-svg" style={{ display: 'inline-flex', marginRight: 4 }}>{Icons.rss}</span>
                Bron: RSS feed vvhooglanderveen.nl
                {editing.link && <a href={editing.link} target="_blank" rel="noreferrer"> — bekijk origineel ↗</a>}
              </div>
              <BerichtForm
                initial={{ title: editing.title, content: editing.content, image: null, ticker: true, duration: DEFAULT_DURATION, font_size: 0, title_size: 0, expires_at: null }}
                onSave={handlePublish}
                onCancel={() => setEditing(null)}
                saveLabel="Publiceren op nieuwsscherm"
              />
            </div>
          </div>
        </>
      )}

      <Toast msg={toast.msg} err={toast.err} show={toast.show} />
    </div>
  );
}

/* ── Beheer main ── */
export default function Beheer() {
  const [berichten, setBerichten]           = useState<Bericht[]>([]);
  const [archivedBerichten, setArchived]    = useState<Bericht[]>([]);
  const [archiveOpen, setArchiveOpen]       = useState(false);
  const [toast, setToast]                   = useState({ msg: '', err: false, show: false });
  const [editing, setEditing]               = useState<Bericht | null>(null);
  const [newOpen, setNewOpen]               = useState(false);
  const [flushLoading, setFlushLoading]     = useState(false);
  const [pushLoading, setPushLoading]       = useState(false);
  const [pushLabel, setPushLabel]           = useState<string | null>(null);
  const [search, setSearch]                 = useState('');
  const [activeTab, setActiveTab]           = useState<'berichten' | 'rss'>('berichten');
  const [rssPending, setRssPending]         = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, err = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, err, show: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  };

  const fetchBerichten = useCallback(async () => {
    try {
      const res = await fetch('/api/berichten?images=true');
      if (!res.ok) return;
      const json = await res.json();
      // Response is { berichten: Bericht[], pushedAt: number }
      const data = Array.isArray(json) ? json : json?.berichten;
      if (Array.isArray(data)) setBerichten(data);
    } catch {}
  }, []);

  const fetchArchived = useCallback(async () => {
    try {
      const res = await fetch('/api/berichten?archived=true');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setArchived(data);
    } catch {}
  }, []);

  const fetchRssBadge = useCallback(async () => {
    try {
      const res = await fetch('/api/rss');
      if (!res.ok) return;
      const items = await res.json();
      setRssPending(Array.isArray(items) ? items.length : 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBerichten();
    fetchArchived();
    fetchRssBadge();
    const id = setInterval(fetchRssBadge, 60_000);
    return () => { clearInterval(id); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [fetchBerichten, fetchArchived, fetchRssBadge]);

  const handleAdd = async (form: FormState) => {
    const res = await fetch('/api/berichten', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category: 'nieuws', expires_at: form.expires_at?.trim() || null }),
    });
    if (!res.ok) { showToast('Fout bij opslaan', true); return; }
    await fetchBerichten();
    setNewOpen(false);
    showToast('Bericht toegevoegd ✓');
  };

  const handleEdit = async (form: FormState) => {
    if (!editing) return;
    const res = await fetch(`/api/berichten/${editing.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category: editing.category, expires_at: form.expires_at?.trim() || null }),
    });
    if (!res.ok) { showToast('Fout bij opslaan', true); return; }
    await fetchBerichten();
    setEditing(null);
    showToast('Bericht bijgewerkt ✓');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bericht definitief verwijderen?')) return;
    await fetch(`/api/berichten/${id}`, { method: 'DELETE' });
    await fetchBerichten();
    showToast('Bericht verwijderd');
  };

  const handleRestore = async (b: Bericht) => {
    await fetch(`/api/berichten/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived_at: null, expires_at: null, active: true }),
    });
    await Promise.all([fetchBerichten(), fetchArchived()]);
    showToast('Bericht hersteld ✓');
  };

  const handleDeleteArchived = async (id: number) => {
    if (!confirm('Bericht definitief verwijderen uit archief?')) return;
    await fetch(`/api/berichten/${id}`, { method: 'DELETE' });
    await fetchArchived();
    showToast('Verwijderd uit archief');
  };

  const handlePush = async () => {
    setPushLoading(true);
    setPushLabel(null);
    try {
      const res = await fetch('/api/admin/push', { method: 'POST' });
      if (!res.ok) throw new Error();
      const { pushedAt } = await res.json();
      const time = new Date(pushedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
      setPushLabel(`✓ Gepusht om ${time}`);
      setTimeout(() => setPushLabel(null), 5000);
    } catch {
      showToast('Push mislukt', true);
    } finally {
      setPushLoading(false);
    }
  };

  const handleFlushCache = async () => {
    setFlushLoading(true);
    try {
      await fetch('/api/admin/flush-cache', { method: 'POST' });
      showToast('Cache geleegd — nieuwe berichten zijn binnen 60 seconden zichtbaar');
    } catch {
      showToast('Cache legen mislukt', true);
    } finally {
      setFlushLoading(false);
    }
  };

  // ── Drag & drop volgorde ──────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const canDrag = !search;

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver  = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOver(idx); };
  const handleDragEnd   = () => { dragIdx.current = null; setDragOver(null); };

  const handleDrop = async (dropIdx: number) => {
    const from = dragIdx.current;
    if (from === null || from === dropIdx) { setDragOver(null); return; }
    const reordered = [...berichten];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIdx, 0, moved);
    setBerichten(reordered);
    setDragOver(null);
    dragIdx.current = null;
    await fetch('/api/berichten', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((b, i) => ({ id: b.id, sort_order: i }))),
    });
  };

  const patch = async (b: Bericht, changes: Partial<Bericht>) => {
    await fetch(`/api/berichten/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    await fetchBerichten();
  };

  // ── Sortering ──────────────────────────────────────────────────────────
  const sorted = [...berichten].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filtered = sorted.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) ||
    stripTags(b.content).toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = berichten.filter(b => b.active).length;
  const tickerCount = berichten.filter(b => b.ticker && b.active).length;

  return (
    <div className="dash-root">

      {/* ── Sidebar ── */}
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <Image src="/logo.png" alt="VV Hooglanderveen" width={36} height={36} />
          <div className="dash-logo-text">
            <span className="dash-logo-club">VV <strong>Hooglanderveen</strong></span>
            <span className="dash-logo-sub">Beheer</span>
          </div>
        </div>

        <nav className="dash-nav">
          <div className={`dash-nav-item${activeTab === 'berichten' ? ' active' : ''}`} onClick={() => setActiveTab('berichten')}>
            <span className="dash-nav-icon">{Icons.list}</span>
            <span>Berichten</span>
          </div>
          <div className={`dash-nav-item${activeTab === 'rss' ? ' active' : ''}`} onClick={() => setActiveTab('rss')}>
            <span className="dash-nav-icon">{Icons.rss}</span>
            <span>RSS Inbox</span>
            {rssPending > 0 && <span className="rss-nav-badge">{rssPending}</span>}
          </div>
        </nav>

        <div className="dash-sidebar-footer">
          <Link href="/" className="dash-screen-link" target="_blank">
            <span className="dash-screen-link-icon">{Icons.monitor}</span>
            <span>Nieuwsscherm</span>
            <span className="dash-screen-link-arrow">{Icons.externalLink}</span>
          </Link>
          <button
            className="dash-logout-btn"
            onClick={async () => {
              await fetch('/api/auth', { method: 'DELETE' });
              window.location.href = '/beheer/login';
            }}
            title="Uitloggen"
          >
            Uitloggen
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dash-main">

        {activeTab === 'rss' && (
          <RssInbox onPublished={() => { fetchBerichten(); fetchRssBadge(); }} />
        )}

        {activeTab !== 'rss' && <>

        {/* Top bar */}
        <div className="dash-topbar">
          <div className="dash-topbar-title">Berichten beheren</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-yellow"
              onClick={handlePush}
              disabled={pushLoading}
              title="Stuur de nieuwste berichten direct naar alle schermen"
            >
              <span className="btn-icon-svg">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 0 1 .75.75v8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 1.06-1.06l2.72 2.72V2.75A.75.75 0 0 1 10 2ZM3 15.75a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"/></svg>
              </span>
              {pushLoading ? 'Pushen…' : (pushLabel ?? 'Push naar schermen')}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleFlushCache}
              disabled={flushLoading}
              title="Ververs de server-cache direct"
            >
              <span className="btn-icon-svg">{Icons.refresh}</span>
              {flushLoading ? 'Bezig…' : 'Cache legen'}
            </button>
            <button className="btn btn-ghost" onClick={() => setNewOpen(true)}>
              <span className="btn-icon-svg">{Icons.plus}</span>
              Nieuw bericht
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon dash-stat-icon--blue">{Icons.document}</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num">{berichten.length}</div>
              <div className="dash-stat-label">Berichten totaal</div>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon dash-stat-icon--green">{Icons.eye}</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num" style={{ color: 'var(--green)' }}>{activeCount}</div>
              <div className="dash-stat-label">Zichtbaar op scherm</div>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon dash-stat-icon--yellow">{Icons.megaphone}</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num" style={{ color: 'var(--yellow-dark)' }}>{tickerCount}</div>
              <div className="dash-stat-label">In ticker</div>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon dash-stat-icon--muted">{Icons.eyeOff}</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num" style={{ color: 'var(--muted)' }}>{berichten.length - activeCount}</div>
              <div className="dash-stat-label">Verborgen</div>
            </div>
          </div>
        </div>

        {/* Zoekbalk + sorteerkeuze */}
        <div className="dash-search-row">
          <div className="dash-search-wrap">
            <span className="dash-search-icon">{Icons.search}</span>
            <input
              className="dash-search"
              placeholder="Zoeken in berichten…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="dash-search-clear" onClick={() => setSearch('')} aria-label="Zoekopdracht wissen">
                <span className="btn-icon-svg" style={{width:12,height:12}}>{Icons.xMark}</span>
              </button>
            )}
          </div>
          <div className="dash-result-count">{filtered.length} bericht{filtered.length !== 1 ? 'en' : ''}</div>
        </div>

        {/* Berichten tabel */}
        <div className="dash-card">
          {filtered.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">{search ? Icons.search : Icons.inbox}</div>
              <div className="dash-empty-text">
                {search ? 'Geen resultaten voor je zoekopdracht.' : 'Nog geen berichten. Voeg er een toe.'}
              </div>
            </div>
          ) : (
            <div className="dash-table">
              <div className={`dash-table-head${!canDrag ? ' no-drag' : ''}`}>
                {canDrag && <div />}
                <div>Bericht</div>
                <div>Status</div>
                <div>Datum</div>
                <div>Acties</div>
              </div>
              {filtered.map((b, idx) => (
                <div
                  key={b.id}
                  className={`dash-row${b.active ? '' : ' dash-row-inactive'}${dragOver === idx ? ' drag-over' : ''}`}
                  style={!canDrag ? { gridTemplateColumns: '1fr 160px 130px 140px', padding: '12px 16px' } : undefined}
                  draggable={canDrag}
                  onDragStart={() => canDrag && handleDragStart(idx)}
                  onDragOver={e => canDrag && handleDragOver(e, idx)}
                  onDrop={() => canDrag && handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                >
                  {canDrag && (
                    <div className="dash-row-grip" title="Versleep om volgorde te wijzigen">{Icons.grip}</div>
                  )}

                  <div className="dash-row-info">
                    {b.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="dash-row-thumb" src={b.image} alt="" />
                    )}
                    <div className="dash-row-text">
                      <div className="dash-row-title">{b.title}</div>
                      {stripTags(b.content).length > 0 && (
                        <div className="dash-row-preview">
                          {stripTags(b.content).slice(0, 120)}{stripTags(b.content).length > 120 ? '…' : ''}
                        </div>
                      )}
                      <ExpiryBadge expires_at={b.expires_at} />
                    </div>
                  </div>

                  <div className="dash-row-status">
                    <label className="dash-toggle" title={b.active ? 'Klik om te verbergen' : 'Klik om te tonen'}>
                      <input type="checkbox" checked={b.active} onChange={() => patch(b, { active: !b.active })} />
                      <span className="dash-toggle-track" />
                      <span className="dash-toggle-label">{b.active ? 'Zichtbaar' : 'Verborgen'}</span>
                    </label>
                    <label className="dash-toggle dash-toggle-yellow" title="Ticker aan/uit">
                      <input type="checkbox" checked={b.ticker} onChange={() => patch(b, { ticker: !b.ticker })} />
                      <span className="dash-toggle-track" />
                      <span className="dash-toggle-label">Ticker</span>
                    </label>
                  </div>

                  <div className="dash-row-date">
                    <div>{fmtDate(b.created_at)}</div>
                    <div className="dash-duration-badge" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 11, height: 11, display: 'inline-flex', flexShrink: 0 }}>{Icons.clock}</span>
                      {b.duration ?? DEFAULT_DURATION}s
                    </div>
                  </div>

                  <div className="dash-row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(b)} aria-label={`Bewerken: ${b.title}`}>
                      <span className="btn-icon-svg">{Icons.pencil}</span>Bewerken
                    </button>
                    <button className="btn btn-red btn-sm icon-only" onClick={() => handleDelete(b.id)} aria-label={`Verwijderen: ${b.title}`}>
                      <span className="btn-icon-svg">{Icons.trash}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Archief ── */}
        <div className="archive-section">
          <button type="button" className="archive-toggle" onClick={() => setArchiveOpen(o => !o)}>
            <span className="btn-icon-svg" style={{width:16,height:16}}>{Icons.archive}</span>
            <span>Archief</span>
            {archivedBerichten.length > 0 && (
              <span className="archive-count-badge">{archivedBerichten.length}</span>
            )}
            <span className="archive-toggle-arrow">{archiveOpen ? '▲' : '▼'}</span>
          </button>

          {archiveOpen && (
            archivedBerichten.length === 0 ? (
              <div className="dash-card">
                <div className="dash-empty">
                  <div className="dash-empty-icon">{Icons.archive}</div>
                  <div className="dash-empty-text">Archief is leeg.</div>
                </div>
              </div>
            ) : (
              <div className="dash-card">
                <div className="dash-table">
                  <div className="dash-table-head no-drag" style={{ gridTemplateColumns: '1fr 140px 200px' }}>
                    <div>Bericht</div>
                    <div>Gearchiveerd op</div>
                    <div>Acties</div>
                  </div>
                  {archivedBerichten.map(b => (
                    <div
                      key={b.id}
                      className="dash-row dash-row-inactive"
                      style={{ gridTemplateColumns: '1fr 140px 200px', padding: '12px 16px' }}
                    >
                      <div className="dash-row-info">
                        {b.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="dash-row-thumb" src={b.image} alt="" />
                        )}
                        <div className="dash-row-text">
                          <div className="dash-row-title">{b.title}</div>
                          {stripTags(b.content).length > 0 && (
                            <div className="dash-row-preview">
                              {stripTags(b.content).slice(0, 100)}{stripTags(b.content).length > 100 ? '…' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="dash-row-date">
                        {b.archived_at ? fmtDate(b.archived_at) : '—'}
                      </div>
                      <div className="dash-row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRestore(b)}>
                          <span className="btn-icon-svg">{Icons.restore}</span>Herstellen
                        </button>
                        <button className="btn btn-red btn-sm icon-only" onClick={() => handleDeleteArchived(b.id)} aria-label={`Verwijderen: ${b.title}`}>
                          <span className="btn-icon-svg">{Icons.trash}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        </> /* einde berichten-tab */}
      </main>

      {/* ── Nieuw bericht drawer ── */}
      {newOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setNewOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">Nieuw bericht</div>
              <button className="btn-icon drawer-close" onClick={() => setNewOpen(false)} aria-label="Sluiten"><span className="btn-icon-svg">{Icons.xMark}</span></button>
            </div>
            <div className="drawer-body">
              <BerichtForm onSave={handleAdd} onCancel={() => setNewOpen(false)} saveLabel="Bericht toevoegen" />
            </div>
          </div>
        </>
      )}

      {/* ── Bewerken drawer ── */}
      {editing && (
        <EditDrawer bericht={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <Toast msg={toast.msg} err={toast.err} show={toast.show} />
    </div>
  );
}
