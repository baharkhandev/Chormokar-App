'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { AIChatPanel } from './AIChatPanel';
import {
  getChatState,
  hydrateChat,
  setFabAnchor,
  subscribeChat,
  toggleChat,
} from './store';

function getCurrentTranslation(el: HTMLElement): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const transform = window.getComputedStyle(el).transform;
  if (!transform || transform === 'none') return { x: 0, y: 0 };

  const m = transform.match(/^matrix\((.+)\)$/);
  if (m && m[1]) {
    const parts = m[1].split(', ');
    const x = parseFloat(parts[4] ?? '0');
    const y = parseFloat(parts[5] ?? '0');
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
  }

  const m3d = transform.match(/^matrix3d\((.+)\)$/);
  if (m3d && m3d[1]) {
    const parts = m3d[1].split(', ');
    const x = parseFloat(parts[12] ?? '0');
    const y = parseFloat(parts[13] ?? '0');
    return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
  }

  return { x: 0, y: 0 };
}

export function AIChatFab() {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const pathname = usePathname() || '';
  const fabRef = useRef<HTMLButtonElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const [quickAccess, setQuickAccess] = useState(true);

  // Remember the last choice so the button does not flash on reload, then
  // reconcile with the saved setting.
  useEffect(() => {
    const stored = window.localStorage.getItem('tp-ai-quick-access');
    if (stored === '0') setQuickAccess(false);
    else if (stored === '1') setQuickAccess(true);

    let alive = true;
    fetch('/api/settings/ai', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        const data = json?.data ?? json;
        if (!alive || typeof data?.quick_access !== 'boolean') return;
        setQuickAccess(data.quick_access);
        window.localStorage.setItem('tp-ai-quick-access', data.quick_access ? '1' : '0');
      })
      .catch(() => {});

    const onQuickAccess = (event: Event) => {
      const value = (event as CustomEvent<boolean>).detail;
      if (typeof value !== 'boolean') return;
      setQuickAccess(value);
      window.localStorage.setItem('tp-ai-quick-access', value ? '1' : '0');
    };
    window.addEventListener('ai:quick-access', onQuickAccess);

    return () => {
      alive = false;
      window.removeEventListener('ai:quick-access', onQuickAccess);
    };
  }, []);

  useEffect(() => {
    hydrateChat();

    // Reset button position on route change or mount
    if (fabRef.current) {
      fabRef.current.style.transition = '';
      fabRef.current.style.transform = '';
    }

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        const el = fabRef.current;
        if (el && !getChatState().open) {
          const rect = el.getBoundingClientRect();
          setFabAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
        toggleChat();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      cleanupDragRef.current?.();
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary mouse button or touch
    if (event.button !== 0) return;

    const el = fabRef.current;
    if (!el) return;

    // Clean up any lingering drag listeners from a previous gesture
    cleanupDragRef.current?.();

    // Freeze element at its instantaneous position if grabbed mid-transition
    const cur = getCurrentTranslation(el);
    el.style.transition = 'none';
    if (cur.x !== 0 || cur.y !== 0) {
      el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
    }

    const startPointerX = event.clientX;
    const startPointerY = event.clientY;
    const baseTx = cur.x;
    const baseTy = cur.y;
    let hasMoved = false;

    // Viewport clamp calculations (button is fixed bottom: 20px, right: 20px, 48x48)
    const homeLeft = window.innerWidth - 68;
    const homeTop = window.innerHeight - 68;
    const minTx = 16 - homeLeft;
    const maxTx = 10;
    const minTy = 16 - homeTop;
    const maxTy = 10;

    const onPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - startPointerX;
      const deltaY = e.clientY - startPointerY;

      if (!hasMoved && Math.hypot(deltaX, deltaY) > 5) {
        hasMoved = true;
      }

      if (hasMoved) {
        const targetX = Math.min(Math.max(baseTx + deltaX, minTx), maxTx);
        const targetY = Math.min(Math.max(baseTy + deltaY, minTy), maxTy);
        el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }
    };

    const returnHome = () => {
      el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = 'translate3d(0, 0, 0)';

      const onTransitionEnd = () => {
        el.removeEventListener('transitionend', onTransitionEnd);
        el.style.transition = '';
        el.style.transform = '';
      };
      el.addEventListener('transitionend', onTransitionEnd, { once: true });
      setTimeout(onTransitionEnd, 480);
    };

    const onPointerUp = () => {
      cleanup();

      if (!hasMoved) {
        // Pure click: ensure clean state, record anchor, and toggle chat
        el.style.transition = '';
        el.style.transform = '';
        const rect = el.getBoundingClientRect();
        setFabAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        toggleChat();
      } else {
        // Drag release: smoothly snap back home
        returnHome();
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerUp);
      cleanupDragRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onPointerUp);

    cleanupDragRef.current = cleanup;
  };

  if (pathname === '/ai/chat') return <AIChatPanel />;

  if (pathname.startsWith('/ai/chat')) {
    return null;
  }

  return (
    <>
      {quickAccess && (
        <button
          ref={fabRef}
        type="button"
        data-ai-fab
        aria-label="Open AI assistant (⌘J)"
        onPointerDown={handlePointerDown}
        className={`fixed bottom-5 right-5 z-[55] flex h-12 w-12 cursor-grab touch-none select-none items-center justify-center rounded-full bg-accent-primary text-white active:cursor-grabbing print:hidden ${
          state.open ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Sparkles size={20} />
          {state.messages.length > 0 && !state.open && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          )}
        </button>
      )}
      <AIChatPanel />
    </>
  );
}
