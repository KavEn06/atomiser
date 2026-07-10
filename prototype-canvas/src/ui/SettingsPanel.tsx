// Workspace settings popover — moved from the variant-D prototype, rewired to the
// settings store (theme / font / connector style).
import type { Status } from '../schema';
import { EDGES, FONTS, THEMES, type EdgeKey, type FontKey, type ThemeKey } from '../theme';
import { useSettings } from '../store/settingsStore';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const th = THEMES[settings.theme];
  const font = FONTS[settings.font];
  const section = `${font.caption} text-[9px] tracking-[0.24em] uppercase`;
  const optionStyle = (active: boolean) => ({
    borderColor: active ? th.accent : th.cardBorder,
    background: active ? `${th.accent}14` : th.card,
    color: th.text,
  });

  return (
    <div
      className="absolute top-[52px] right-4 z-50 w-[344px] rounded-md border p-4 shadow-xl"
      style={{ background: th.panel, borderColor: th.border }}
    >
      <div className="flex items-center justify-between">
        <span className={section} style={{ color: th.subtext }}>
          Workspace settings
        </span>
        <button onClick={onClose} aria-label="Close settings" className="cursor-pointer text-[12px]" style={{ color: th.faint }}>
          ✕
        </button>
      </div>

      <div className={`mt-4 ${section}`} style={{ color: th.faint }}>
        Theme
      </div>
      <div className="mt-1.5 flex gap-2">
        {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
          const t = THEMES[k];
          return (
            <button
              key={k}
              onClick={() => settings.setTheme(k)}
              className="flex-1 cursor-pointer rounded-md border p-2 text-left"
              style={optionStyle(settings.theme === k)}
            >
              <span
                className="flex h-7 items-center justify-center gap-1.5 rounded-sm border"
                style={{ background: t.app, borderColor: t.cardBorder }}
              >
                {(['done', 'in_progress', 'blocked', 'todo'] as Status[]).map((s) => (
                  <span key={s} className="h-2 w-2 rounded-full" style={{ background: t.status[s] }} />
                ))}
              </span>
              <span className="mt-1.5 block text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`mt-4 ${section}`} style={{ color: th.faint }}>
        Font
      </div>
      <div className="mt-1.5 flex gap-2">
        {(Object.keys(FONTS) as FontKey[]).map((k) => (
          <button
            key={k}
            onClick={() => settings.setFont(k)}
            className="flex-1 cursor-pointer rounded-md border p-2 text-center"
            style={optionStyle(settings.font === k)}
          >
            <span className={`${FONTS[k].body} block text-[17px] leading-none`}>Ag</span>
            <span className="mt-1.5 block text-[11px]">{FONTS[k].label}</span>
          </button>
        ))}
      </div>

      <div className={`mt-4 ${section}`} style={{ color: th.faint }}>
        Connectors
      </div>
      <div className="mt-1.5 flex gap-2">
        {(Object.keys(EDGES) as EdgeKey[]).map((k) => {
          const active = settings.edges === k;
          const stroke = active ? th.accent : th.subtext;
          return (
            <button
              key={k}
              onClick={() => settings.setEdges(k)}
              className="flex-1 cursor-pointer rounded-md border p-2 text-center"
              style={optionStyle(active)}
            >
              <svg width="34" height="22" viewBox="0 0 34 22" className="mx-auto block">
                <defs>
                  <marker
                    id={`proto-arrow-${k}`}
                    viewBox="0 0 8 8"
                    refX="6.5"
                    refY="4"
                    markerWidth="5.5"
                    markerHeight="5.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M0 0 L8 4 L0 8 Z" fill={stroke} />
                  </marker>
                </defs>
                <path
                  d={EDGES[k].preview}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="1.6"
                  markerEnd={`url(#proto-arrow-${k})`}
                />
              </svg>
              <span className="mt-1 block text-[11px]">{EDGES[k].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
