'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/beheer');
        router.refresh();
      } else {
        setError('Verkeerd wachtwoord. Probeer opnieuw.');
      }
    } catch {
      setError('Verbindingsfout. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <Image src="/logo.png" alt="VV Hooglanderveen" width={64} height={64} />
        </div>
        <div className="login-title">VV Hooglanderveen</div>
        <div className="login-sub">Kantine beheer</div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="password" className="login-label">Wachtwoord</label>
          <input
            id="password"
            type="password"
            className="login-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Bezig…' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}
