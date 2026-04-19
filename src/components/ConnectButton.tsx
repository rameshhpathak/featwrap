'use client';
import { Button } from './Button';
import { useState } from 'react';

export function ConnectButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch('/api/connect/start', { method: 'POST' });
        const { redirectUrl } = await res.json();
        if (redirectUrl) window.location.href = redirectUrl;
        else setLoading(false);
      }}
    >
      {loading ? 'Redirecting…' : 'Connect GitHub'}
    </Button>
  );
}
