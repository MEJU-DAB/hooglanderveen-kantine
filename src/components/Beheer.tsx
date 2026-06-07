'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

/* ── helpers ── */
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return s; }
}

/* ── types ── */
const DEFAULT_DURATION = 10; // seconden

interface FormState {
  title: string;
  content: string;
  image: string | null;
  ticker: boolean;
  duration: number;
}
const emptyForm = (): FormState => ({ title: '', content: '', image: null, ticker: true, duration: DEFAULT_DURATION });

/* ── Toast ── */
function Toast({ msg, err, show }: { msg: string; err: boolean; show: boolean }) {
  return <div className={`toast${show ? ' show' : ''}${err ? ' err' : ''}`}>{msg}</div>;
}

/* ── ImageUpload ── */
function ImageUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      {value ? (
        <div className="img-preview-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" />
          <button className="img-remove" onClick={() => onChange(null)} type="button">✕</button>
        </div>
      ) : (
        <div className="img-upload-area"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <p>📷 <strong>Klik</strong> of sleep een afbeelding</p>
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
      {/* Undo / Redo */}
      <div className="tip-group">
        {btn(!editor.can().undo(), () => editor.chain().focus().undo().run(), '↩', 'Ongedaan maken')}
        {btn(!editor.can().redo(), () => editor.chain().focus().redo().run(), '↪', 'Opnieuw')}
      </div>
      <span className="tip-sep" />

      {/* Headings */}
      <div className="tip-group">
        {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', 'Kop 1')}
        {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', 'Kop 2')}
        {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', 'Kop 3')}
      </div>
      <span className="tip-sep" />

      {/* Inline opmaak */}
      <div className="tip-group">
        {btn(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      <strong>V</strong>, 'Vet')}
        {btn(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    <em>S</em>,         'Cursief')}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <u>O</u>,           'Onderstrepen')}
        {btn(editor.isActive('strike'),    () => editor.chain().focus().toggleStrike().run(),    <s>D</s>,           'Doorhalen')}
        {btn(editor.isActive('code'),      () => editor.chain().focus().toggleCode().run(),      <code style={{fontFamily:'monospace'}}>{'<>'}</code>, 'Code')}
      </div>
      <span className="tip-sep" />

      {/* Uitlijning */}
      <div className="tip-group">
        {btn(editor.isActive({ textAlign: 'left' }),    () => editor.chain().focus().setTextAlign('left').run(),    '⬅', 'Links')}
        {btn(editor.isActive({ textAlign: 'center' }),  () => editor.chain().focus().setTextAlign('center').run(),  '↔', 'Centreren')}
        {btn(editor.isActive({ textAlign: 'right' }),   () => editor.chain().focus().setTextAlign('right').run(),   '➡', 'Rechts')}
      </div>
      <span className="tip-sep" />

      {/* Lijsten */}
      <div className="tip-group">
        {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  '• Lijst',  'Opsomming')}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1. Lijst', 'Genummerd')}
      </div>
      <span className="tip-sep" />

      {/* Blokken */}
      <div className="tip-group">
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '❝', 'Citaat')}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), '─', 'Lijn')}
        {btn(editor.isActive('link'),       setLink,                                               '🔗', 'Link invoegen')}
      </div>
      <span className="tip-sep" />

      {/* Clear */}
      <div className="tip-group">
        {btn(false, () => editor.chain().focus().clearNodes().unsetAllMarks().run(), '✕ opmaak', 'Opmaak verwijderen', true)}
      </div>
    </div>
  );
}

/* ── RichEditor (Tiptap wrapper) ── */
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
    editorProps: {
      attributes: { class: 'tip-editor-content' },
    },
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
        <span className="pagina-preview-title">
          Paginaindeling op nieuwsscherm
        </span>
        <span className={`pagina-count-badge ${pages.length > 1 ? 'multi' : 'single'}`}>
          {pages.length === 1 ? '✓ 1 pagina' : `${pages.length} pagina's`}
        </span>
      </div>
      <div className="pagina-list">
        {pages.map((chunk, i) => (
          <div key={i} className="pagina-item">
            <div className="pagina-item-label">Pagina {i + 1}</div>
            <div className="pagina-item-text"
              dangerouslySetInnerHTML={{ __html: chunk }} />
          </div>
        ))}
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

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const hasContent = stripTags(form.content).length > 0;

  return (
    <form onSubmit={handleSubmit} className="bericht-form">

      {/* Titel */}
      <div className="form-section">
        <label className="form-label">Titel <span className="required">*</span></label>
        <input className="form-input form-input-lg"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Grote kop op het nieuwsscherm"
          required />
      </div>

      {/* Tekst */}
      <div className="form-section">
        <label className="form-label">Berichttekst</label>
        <RichEditor value={form.content} onChange={v => set('content', v)} />
      </div>

      {/* Pagina preview toggle */}
      {hasContent && (
        <div className="form-section">
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => setShowPages(p => !p)}>
            {showPages ? '▲ Paginaindeling verbergen' : '▼ Paginaindeling bekijken'}
          </button>
          {showPages && <PaginaPreview content={form.content} hasImage={!!form.image} />}
        </div>
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
              <span>📢 Titel meedraaien in de ticker</span>
              <span className="ticker-option-sub">Titel verschijnt in de scrollbalk onderaan het scherm</span>
            </span>
          </label>
        </div>
      </div>

      {/* Weergaveduur */}
      <div className="form-section">
        <label className="form-label">⏱ Weergaveduur</label>
        <div className="duration-value">
          <input
            type="number" min={5} max={60} step={1}
            value={form.duration}
            onChange={e => set('duration', Math.min(60, Math.max(5, Number(e.target.value) || DEFAULT_DURATION)))}
            className="duration-input"
          />
          <span className="duration-unit">seconden</span>
        </div>
        <div className="duration-hint">Standaard: {DEFAULT_DURATION}s · min. 5s · max. 60s</div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-yellow" disabled={saving}>
          {saving ? '⏳ Opslaan…' : `✔ ${saveLabel}`}
        </button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuleren</button>}
      </div>
    </form>
  );
}

/* ── EditDrawer (slide-in panel) ── */
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
          <button className="btn-icon drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          <BerichtForm
            initial={{ title: bericht.title, content: bericht.content, image: bericht.image, ticker: bericht.ticker, duration: bericht.duration ?? DEFAULT_DURATION }}
            onSave={onSave}
            onCancel={onClose}
            saveLabel="Wijzigingen opslaan"
          />
        </div>
      </div>
    </>
  );
}

/* ── Beheer main ── */
export default function Beheer() {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [toast, setToast] = useState({ msg: '', err: false, show: false });
  const [editing, setEditing] = useState<Bericht | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, err = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, err, show: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  };

  const fetchBerichten = useCallback(async () => {
    const res = await fetch('/api/berichten');
    setBerichten(await res.json());
  }, []);

  useEffect(() => { fetchBerichten(); }, [fetchBerichten]);

  const handleAdd = async (form: FormState) => {
    const res = await fetch('/api/berichten', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category: 'nieuws' }),
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
      body: JSON.stringify({ ...form, category: editing.category }),
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

  const patch = async (b: Bericht, changes: Partial<Bericht>) => {
    await fetch(`/api/berichten/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    await fetchBerichten();
  };

  const activeCount = berichten.filter(b => b.active).length;
  const tickerCount = berichten.filter(b => b.ticker && b.active).length;

  const filtered = berichten.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) ||
    stripTags(b.content).toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="dash-nav-item active">
            <span className="dash-nav-icon">📋</span>
            <span>Berichten</span>
          </div>
        </nav>

        <div className="dash-sidebar-footer">
          <Link href="/" className="dash-screen-link" target="_blank">
            <span>▶</span>
            <span>Nieuwsscherm</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dash-main">

        {/* Top bar */}
        <div className="dash-topbar">
          <div className="dash-topbar-title">Berichten beheren</div>
          <button className="btn btn-yellow" onClick={() => setNewOpen(true)}>
            + Nieuw bericht
          </button>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon">📋</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num">{berichten.length}</div>
              <div className="dash-stat-label">Berichten totaal</div>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon">✅</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num" style={{ color: 'var(--green)' }}>{activeCount}</div>
              <div className="dash-stat-label">Zichtbaar op scherm</div>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon">📢</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num" style={{ color: 'var(--yellow-dark)' }}>{tickerCount}</div>
              <div className="dash-stat-label">In ticker</div>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon">🙈</div>
            <div className="dash-stat-body">
              <div className="dash-stat-num" style={{ color: 'var(--muted)' }}>{berichten.length - activeCount}</div>
              <div className="dash-stat-label">Verborgen</div>
            </div>
          </div>
        </div>

        {/* Zoekbalk */}
        <div className="dash-search-row">
          <div className="dash-search-wrap">
            <span className="dash-search-icon">🔍</span>
            <input
              className="dash-search"
              placeholder="Zoeken in berichten…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="dash-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <div className="dash-result-count">{filtered.length} bericht{filtered.length !== 1 ? 'en' : ''}</div>
        </div>

        {/* Berichten tabel */}
        <div className="dash-card">
          {filtered.length === 0 ? (
            <div className="dash-empty">
              <div className="dash-empty-icon">{search ? '🔍' : '📋'}</div>
              <div className="dash-empty-text">
                {search ? 'Geen resultaten voor je zoekopdracht.' : 'Nog geen berichten. Voeg er een toe.'}
              </div>
            </div>
          ) : (
            <div className="dash-table">
              <div className="dash-table-head">
                <div>Bericht</div>
                <div>Status</div>
                <div>Datum</div>
                <div>Acties</div>
              </div>
              {filtered.map(b => (
                <div key={b.id} className={`dash-row${b.active ? '' : ' dash-row-inactive'}`}>

                  {/* Bericht info */}
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
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="dash-row-status">
                    <label className="dash-toggle" title={b.active ? 'Klik om te verbergen' : 'Klik om te tonen'}>
                      <input type="checkbox" checked={b.active}
                        onChange={() => patch(b, { active: !b.active })} />
                      <span className="dash-toggle-track" />
                      <span className="dash-toggle-label">{b.active ? 'Zichtbaar' : 'Verborgen'}</span>
                    </label>
                    <label className="dash-toggle dash-toggle-yellow" title="Ticker aan/uit">
                      <input type="checkbox" checked={b.ticker}
                        onChange={() => patch(b, { ticker: !b.ticker })} />
                      <span className="dash-toggle-track" />
                      <span className="dash-toggle-label">Ticker</span>
                    </label>
                  </div>

                  {/* Datum + duur */}
                  <div className="dash-row-date">
                    <div>{fmtDate(b.created_at)}</div>
                    <div className="dash-duration-badge">⏱ {b.duration ?? DEFAULT_DURATION}s</div>
                  </div>

                  {/* Acties */}
                  <div className="dash-row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(b)}>
                      ✏ Bewerken
                    </button>
                    <button className="btn btn-red btn-sm" onClick={() => handleDelete(b.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Nieuw bericht drawer ── */}
      {newOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setNewOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <div className="drawer-title">Nieuw bericht</div>
              <button className="btn-icon drawer-close" onClick={() => setNewOpen(false)}>✕</button>
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
