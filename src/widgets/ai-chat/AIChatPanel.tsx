'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Maximize2, Sparkles, X } from 'lucide-react';
import gsap from 'gsap';
import { ChatFullView } from './ChatFullView';
import { closeChat, getChatState, getFabAnchor, subscribeChat } from './store';

const PANEL_STORAGE_KEY = 'tp_ai_panel_offset';

export function AIChatPanel() {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const pathname = usePathname() || '';
  const [visible, setVisible] = useState(state.open);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const motionRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const offsetRef = useRef(offset);
  const hasAnimatedInRef = useRef(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  // Load saved offset once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          offsetRef.current = { x: parsed.x, y: parsed.y };
          setOffset({ x: parsed.x, y: parsed.y });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Escape key handler
  useEffect(() => {
    if (!state.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChat();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.open]);

  // Mount when opening so the entrance animation can measure the panel.
  useEffect(() => {
    if (state.open) {
      setVisible(true);
    } else {
      hasAnimatedInRef.current = false;
    }
  }, [state.open]);

  // Entrance animation: ONLY runs once when opening from the floating button.
  useLayoutEffect(() => {
    const el = motionRef.current;
    if (!el || !visible || !state.open || hasAnimatedInRef.current) return;
    hasAnimatedInRef.current = true;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const rect = el.getBoundingClientRect();
    const visualLeft = rect.left + offsetRef.current.x;
    const visualTop = rect.top + offsetRef.current.y;
    const anchor = getFabAnchor() ?? { x: rect.right - 24, y: rect.bottom - 24 };
    const originX = Math.min(Math.max(anchor.x - visualLeft, 0), rect.width);
    const originY = Math.min(Math.max(anchor.y - visualTop, 0), rect.height);

    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { scale: 0.12, opacity: 0, transformOrigin: `${originX}px ${originY}px` },
      {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: 'power3.out',
        clearProps: 'transform,opacity,transformOrigin',
      }
    );
  }, [state.open, visible]);

  // Exit animation: shrinks back into the button on close, then unmounts.
  useEffect(() => {
    if (state.open || !visible) return;
    const el = motionRef.current;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!el || reduce) {
      setVisible(false);
      return;
    }

    gsap.killTweensOf(el);
    gsap.to(el, {
      scale: 0.12,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => setVisible(false),
    });
  }, [state.open, visible]);

  // Clean up GSAP and drag on unmount
  useEffect(() => {
    const el = motionRef.current;
    return () => {
      if (el) gsap.killTweensOf(el);
      cleanupDragRef.current?.();
    };
  }, []);

  const handleHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button,a,input,textarea')) return;

    const panel = panelRef.current;
    if (!panel) return;

    cleanupDragRef.current?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const baseTx = offsetRef.current.x;
    const baseTy = offsetRef.current.y;

    const rect = panel.getBoundingClientRect();
    const naturalLeft = rect.left - baseTx;
    const naturalTop = rect.top - baseTy;
    const naturalRight = rect.right - baseTx;
    const naturalBottom = rect.bottom - baseTy;

    const minX = 16 - naturalLeft;
    const maxX = window.innerWidth - 16 - naturalRight;
    const minY = 16 - naturalTop;
    const maxY = window.innerHeight - 16 - naturalBottom;

    let hasMoved = false;

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 4) {
        hasMoved = true;
      }

      if (hasMoved) {
        const targetX = Math.min(Math.max(baseTx + dx, minX), maxX);
        const targetY = Math.min(Math.max(baseTy + dy, minY), maxY);

        offsetRef.current = { x: targetX, y: targetY };
        panel.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }
    };

    const onPointerUp = () => {
      cleanup();

      if (hasMoved) {
        try {
          localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(offsetRef.current));
        } catch {
          // ignore
        }
        setOffset({ ...offsetRef.current });
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

  if (!visible || pathname === '/ai/chat') return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close assistant"
        onClick={closeChat}
        className="fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-[2px] transition-opacity xl:hidden"
      />
      <div
        ref={motionRef}
        className="fixed right-3 bottom-20 z-[61] h-[600px] max-h-[calc(100vh-6rem)] w-[calc(100%-1.5rem)] max-w-[420px] sm:right-6 sm:bottom-24"
      >
        <aside
          ref={panelRef}
          role="dialog"
          aria-label="Chormokar AI assistant"
          aria-modal="false"
          style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border-color bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)]"
        >
          {/* Minimal, quiet header */}
          <div
            className="flex cursor-grab touch-none select-none items-center justify-between border-b border-border-color bg-white px-4 py-3 active:cursor-grabbing"
            onPointerDown={handleHeaderPointerDown}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-bg-secondary text-text-primary">
                <Sparkles size={13} />
              </span>
              <span className="text-[13px] font-semibold text-text-primary">
                AI Assistant
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/ai/chat"
                title="Expand to full page"
                aria-label="Expand to full page"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <Maximize2 size={13.5} />
              </Link>
              <button
                type="button"
                onClick={closeChat}
                title="Close"
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <ChatFullView variant="panel" />
        </aside>
      </div>
    </>
  );
}
