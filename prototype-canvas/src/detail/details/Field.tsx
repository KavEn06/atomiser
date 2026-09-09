import type { ReactNode } from 'react';
import { useSettings } from '../../store/settingsStore';
import { FONTS, THEMES, type Theme } from '../../theme';

// The drawer's field chrome, matching the caps-label idiom the settings panel
// and the "Up next" dock already use. Each control carries its own aria-label,
// so this is a heading rather than a <label for>.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const th = THEMES[useSettings((s) => s.theme)];
  const font = FONTS[useSettings((s) => s.font)];
  return (
    <div>
      <div
        className={`${font.caption} text-[9px] tracking-[0.24em] uppercase`}
        style={{ color: th.faint }}
      >
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export const controlStyle = (th: Theme) => ({
  borderColor: th.cardBorder,
  background: th.card,
  color: th.text,
});

// Selected-option styling, the same treatment SettingsPanel's theme/font/
// connector pickers use.
export const optionStyle = (th: Theme, active: boolean) => ({
  borderColor: active ? th.accent : th.cardBorder,
  background: active ? `${th.accent}14` : th.card,
  color: th.text,
});
