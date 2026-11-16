'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'admin-theme';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const cookie = document.cookie.match(/(?:^|; )admin-theme=(dark|light)/)?.[1];
    const saved = cookie || localStorage.getItem(STORAGE_KEY);
    const dark = saved === 'dark';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
    // Migrate a localStorage-only preference so the server can render it.
    if (!cookie) {
      document.cookie = `${STORAGE_KEY}=${dark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    document.cookie = `${STORAGE_KEY}=${next ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-color bg-white text-text-secondary transition-colors hover:text-text-primary"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
