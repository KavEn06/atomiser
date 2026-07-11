// Atomiser — the v0 user-focused flowgraph editor (IDE mode). Agent mode arrives
// with the AI. Canvas is the primary surface; a node opens into a detail drawer.
import { useEffect, useState } from 'react';
import { Editor } from './canvas/Editor';
import { NodeDrawer } from './detail/NodeDrawer';
import { SettingsPanel } from './ui/SettingsPanel';
import { useGraphStore } from './store/graphStore';
import { useSettings } from './store/settingsStore';
import { FONTS, THEMES } from './theme';

export default function App() {
  const title = useGraphStore((s) => s.graph.title);
  const nodeCount = useGraphStore((s) => Object.keys(s.nodes).length);
  const addNode = useGraphStore((s) => s.addNode);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const loadSeed = useGraphStore((s) => s.loadSeed);
  const th = THEMES[useSettings((s) => s.theme)];
  const font = FONTS[useSettings((s) => s.font)];
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Seed the sample graph on a truly empty first load.
  useEffect(() => {
    if (nodeCount === 0 && !localStorage.getItem('atomiser:seeded:v1')) {
      loadSeed();
      localStorage.setItem('atomiser:seeded:v1', '1');
    }
  }, [nodeCount, loadSeed]);

  return (
    <div className={`flex h-full w-full flex-col ${font.body}`} style={{ background: th.app, color: th.text }}>
      <header
        className="relative flex h-12 shrink-0 items-center gap-3 border-b px-4"
        style={{ borderColor: th.border, background: th.panel }}
      >
        <span className="text-[14px] font-semibold tracking-tight">
          Atomiser<span style={{ color: th.faint }}> / {title}</span>
        </span>

        {/* Mode indicator — IDE now, Agent later (Cursor-style split) */}
        <span className="ml-2 flex overflow-hidden rounded border text-[10px]" style={{ borderColor: th.cardBorder }}>
          <span className="px-2 py-0.5 font-semibold" style={{ background: th.accent, color: th.onAccent }}>
            IDE
          </span>
          <span className="px-2 py-0.5" style={{ color: th.faint }} title="Coming with AI">
            Agent · soon
          </span>
        </span>

        <div className="ml-auto flex items-center gap-2 text-[12px]">
          <button
            onClick={() => addNode({ x: 40, y: 40 })}
            className="rounded px-2 py-1"
            style={{ background: th.accent, color: th.onAccent }}
          >
            ＋ Add node
          </button>
          <button
            onClick={() => {
              if (confirm('Clear the whole graph?')) clearGraph();
            }}
            className="rounded border px-2 py-1"
            style={{ borderColor: th.cardBorder, color: th.subtext }}
          >
            Clear
          </button>
          <button
            aria-label="Settings"
            onClick={() => setSettingsOpen((o) => !o)}
            className="rounded border px-2 py-1"
            style={{ borderColor: th.cardBorder, color: th.subtext }}
          >
            ⚙
          </button>
        </div>
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </header>

      <div className="relative min-h-0 flex-1">
        <Editor />
        <NodeDrawer />
      </div>
    </div>
  );
}
