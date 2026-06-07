'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bericht, Category } from '@/lib/types';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'nieuws', label: 'Nieuws', icon: '📰' },
  { value: 'wedstrijd', label: 'Wedstrijd', icon: '⚽' },
  { value: 'selectie', label: 'Selectie', icon: '🏆' },
  { value: 'jeugd', label: 'Jeugd', icon: '🌱' },
  { value: 'overig', label: 'Overig', icon: '📌' },
];

function catLabel(c: string) {
  return CATEGORIES.find(x => x.value === c)?.label ?? c;
}

function catIcon(c: string) {
  return CATEGORIES.find(x => x.value === c)?.icon ?? '📌';
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

function renderPreview(t: string) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

interface FormState {
  title: string;
  content: string;
  category: Category;
  image: string | null;
}

const emptyForm = (): FormState => ({ title: '', content: '', category: 'nieuws', image: null });

function Toast({ msg, err, show }: { msg: string; err: boolean; show: boolean }) {
  return (
    <div className={`toast${show ? ' show' : ''}${err ? ' err' : ''}`}>{msg}</div>
  );
}

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
        <div
          className="img-upload-area"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <p>📷 <strong>Klik</strong> of sleep een afbeelding</p>
        </div>
      )}
    </div>
  );
}

function BerichtForm({
  initial,
  onSave,
  onCancel,
  saveLabel = 'Opslaan',
}: {
  initial?: FormState;
  onSave: (f: FormState) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm());
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof FormState, v: string | null) => setForm(f => ({ ...f, [k]: v }));

  const wrap = (a: string, b: string) => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = form.content.slice(start, end) || 'tekst';
    const next = form.content.slice(0, start) + a + selected + b + form.content.slice(end);
    set('content', next);
    setTimeout(() => { el.setSelectionRange(start + a.length, start + a.length + selected.length); el.focus(); }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group full">
          <label>Titel *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Grote kop op het scherm"
            required
          />
        </div>
        <div className="form-group">
          <label>Categorie</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Afbeelding</label>
          <ImageUpload value={form.image} onChange={v => set('image', v)} />
        </div>
        <div className="form-group full">
          <label>Berichttekst</label>
          <div className="toolbar">
            <button type="button" className="toolbar-btn" onClick={() => wrap('**', '**')}>Vet</button>
            <button type="button" className="toolbar-btn" onClick={() => wrap('*', '*')}>Cursief</button>
          </div>
          <textarea
            ref={contentRef}
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Optionele tekst onder de kop. Gebruik **vet** of *cursief*."
            rows={4}
          />
          {form.content && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 4 }}>Voorbeeld</div>
              <div className="text-preview" dangerouslySetInnerHTML={{ __html: renderPreview(form.content) }} />
            </div>
          )}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-yellow" disabled={saving}>
          {saving ? '⏳ Opslaan…' : `✔ ${saveLabel}`}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuleren</button>
        )}
      </div>
    </form>
  );
}

function EditModal({ bericht, onSave, onClose }: { bericht: Bericht; onSave: (f: FormState) => Promise<void>; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">✏ Bericht bewerken</div>
        <BerichtForm
          initial={{ title: bericht.title, content: bericht.content, category: bericht.category, image: bericht.image }}
          onSave={onSave}
          onCancel={onClose}
          saveLabel="Wijzigingen opslaan"
        />
      </div>
    </div>
  );
}

export default function Beheer() {
  const [berichten, setBerichten] = useState<Bericht[]>([]);
  const [toast, setToast] = useState({ msg: '', err: false, show: false });
  const [editing, setEditing] = useState<Bericht | null>(null);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { showToast('Fout bij opslaan', true); return; }
    await fetchBerichten();
    showToast('Bericht toegevoegd ✓');
  };

  const handleEdit = async (form: FormState) => {
    if (!editing) return;
    const res = await fetch(`/api/berichten/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { showToast('Fout bij opslaan', true); return; }
    await fetchBerichten();
    setEditing(null);
    showToast('Bericht bijgewerkt ✓');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bericht verwijderen?')) return;
    await fetch(`/api/berichten/${id}`, { method: 'DELETE' });
    await fetchBerichten();
    showToast('Bericht verwijderd');
  };

  const handleToggle = async (b: Bericht) => {
    await fetch(`/api/berichten/${b.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !b.active }),
    });
    await fetchBerichten();
  };

  const Logo = () => (
    <svg className="admin-logo" viewBox="0 0 60 60" fill="none">
      <path d="M30 2 L55 15 L55 38 Q55 52 30 58 Q5 52 5 38 L5 15 Z" fill="#f5c800" stroke="#0b2d52" strokeWidth="2"/>
      <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fill="#0b2d52" fontSize="18" fontWeight="bold" fontFamily="sans-serif">VV</text>
      <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle" fill="#0b2d52" fontSize="6.5" fontFamily="sans-serif" letterSpacing="0.5">HV</text>
    </svg>
  );

  const activeCount = berichten.filter(b => b.active).length;

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Logo />
          <div className="admin-title">
            VV <span>Hooglanderveen</span> — Beheer
          </div>
        </div>
        <Link href="/" className="nav-btn" target="_blank">
          ▶ Nieuwsscherm
        </Link>
      </header>

      <div className="admin-body">
        {/* Nieuw bericht */}
        <div className="card">
          <div className="card-title">Nieuw bericht</div>
          <BerichtForm onSave={handleAdd} saveLabel="Bericht toevoegen" />
        </div>

        {/* Berichten lijst */}
        <div className="card">
          <div className="list-header">
            <div className="list-title">
              Berichten
              <span className="count-pill">{berichten.length}</span>
              {activeCount > 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
                  {activeCount} actief
                </span>
              )}
            </div>
          </div>

          {berichten.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              Nog geen berichten. Voeg er een toe hierboven.
            </p>
          ) : (
            <div className="news-list">
              {berichten.map(b => (
                <div key={b.id} className={`news-item${b.active ? '' : ' inactive'}`}>
                  <div>
                    {b.image
                      ? <img className="news-thumb" src={b.image} alt="" />
                      : <div className="news-thumb-placeholder">{catIcon(b.category)}</div>
                    }
                  </div>
                  <div className="news-item-body">
                    <div className="news-item-meta">
                      <span className={`tag tag-${b.category}`}>{catLabel(b.category)}</span>
                      <span className="news-item-date">{fmtDate(b.created_at)}</span>
                    </div>
                    <div className="news-item-title">{b.title}</div>
                    {b.content && <div className="news-item-preview">{b.content.replace(/\*+/g, '')}</div>}
                  </div>
                  <div className="news-item-actions">
                    <label className="switch" title={b.active ? 'Verbergen' : 'Tonen'}>
                      <input type="checkbox" checked={b.active} onChange={() => handleToggle(b)} />
                      <span className="switch-slider" />
                    </label>
                    <button className="btn-icon" title="Bewerken" onClick={() => setEditing(b)}>✏</button>
                    <button className="btn-icon" title="Verwijderen" onClick={() => handleDelete(b.id)}
                      style={{ color: 'var(--red)' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditModal bericht={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
      )}

      <Toast msg={toast.msg} err={toast.err} show={toast.show} />
    </div>
  );
}
