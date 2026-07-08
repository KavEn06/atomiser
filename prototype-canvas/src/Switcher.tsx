// PROTOTYPE — floating variant switcher. Not part of any design being evaluated.
import { useEffect, useState } from 'react';

export interface VariantDef {
  key: string;
  name: string;
}

function readVariant(keys: string[]): string {
  const v = new URLSearchParams(window.location.search).get('variant');
  return v && keys.includes(v) ? v : keys[0];
}

export function useVariant(defs: VariantDef[]) {
  const keys = defs.map((d) => d.key);
  const [variant, set] = useState(() => readVariant(keys));
  useEffect(() => {
    const onPop = () => set(readVariant(keys));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setVariant = (k: string) => {
    const u = new URL(window.location.href);
    u.searchParams.set('variant', k);
    history.replaceState(null, '', u);
    set(k);
  };
  return [variant, setVariant] as const;
}

export function PrototypeSwitcher({
  defs,
  current,
  onChange,
}: {
  defs: VariantDef[];
  current: string;
  onChange: (k: string) => void;
}) {
  const idx = Math.max(
    0,
    defs.findIndex((d) => d.key === current),
  );
  const go = (delta: number) => onChange(defs[(idx + delta + defs.length) % defs.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable ||
          t.closest('.react-flow'))
      )
        return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950/90 px-2 py-1.5 font-plexmono text-xs text-zinc-100 shadow-2xl backdrop-blur select-none">
      <button
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="rounded-full px-2 py-0.5 hover:bg-zinc-800"
      >
        ←
      </button>
      <span className="min-w-[190px] px-2 text-center tracking-wide">
        {defs[idx].key} — {defs[idx].name} <span className="text-zinc-500">· prototype</span>
      </span>
      <button
        onClick={() => go(1)}
        aria-label="Next variant"
        className="rounded-full px-2 py-0.5 hover:bg-zinc-800"
      >
        →
      </button>
    </div>
  );
}
