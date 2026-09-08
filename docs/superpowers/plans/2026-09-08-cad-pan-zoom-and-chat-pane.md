# Plan — Chunk 1 (land CAD pan/zoom) + Chunk 2 (chat pane that just talks)

## Context

Atomiser's v0 flowgraph editor (`prototype-canvas/`) is a local-only Vite/React/React Flow app with
no backend and no AI. The agreed build order for Agent mode is a sequence of vertical slices, each
ending with something you can open in the browser and verify. This plan covers the first two:

- **Chunk 1** — land the in-flight CAD-style pan/zoom + bottom-left UndoRedo work that is sitting
  *uncommitted* in the stale worktree `.claude/worktrees/seamless-pan`. Verified: every commit on
  `feat/seamless-pan` is already on `main` (`git cherry` marks all nine patch-equivalent); only the
  working-tree changes are new; the `Editor.tsx` patch applies cleanly, but the `Toolbar.tsx` half
  must be redone by hand because `main` has since refactored the toolbar into a `ToolButton`
  wrapper (tooltips + auto-arrange). All 48 tests pass inside the worktree.
- **Chunk 2** — the first Agent-mode slice: a chat pane beside the canvas that streams a real Claude
  reply, with *no* graph awareness and *no* tools. It proves the key-holding server, the API call,
  the streaming path, and the two-pane shell — the pieces every later slice sits on — while nothing
  can yet mutate the graph.

## Decisions baked into this plan (say so if you want any changed)

| Decision | Choice | Why |
|---|---|---|
| Pane placement | **Left, 400 px, flex sibling** of the canvas, collapsible from a header `Chat` button | Variant D's settled layout. `NodeDrawer` is an absolute *right* overlay (z-30); `Toolbar`/`UndoRedo` are absolute overlays *inside* the canvas wrapper so they shift with it. The `IDE / Agent · soon` pill is untouched — proposals are a later slice. |
| Server | **Minimal Hono app on Bun**, one route, key-holder only | Not the spec's full Hono/Postgres/tRPC stack — that port is the last chunk. Hono because the spec picks it and it costs nothing extra here. |
| Wire format | Our own SSE vocabulary `text` / `done` / `error` | The browser never depends on the Anthropic event shapes; later slices add events (tool use) without touching the client parser. |
| Model / params | `claude-opus-5`, streaming, adaptive thinking (omit `thinking`), `output_config.effort: 'medium'`, `max_tokens: 16000` | Current SDK surface. Effort is a named constant — later graph-reasoning slices raise it. |
| Refusal fallbacks | **On by default**: `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'` | Recommended default for Opus 5. One param; drop it if you'd rather not. |
| Secrets | `ANTHROPIC_API_KEY` in `prototype-canvas/.envrc` (direnv, already gitignored); `.env*` added to `.gitignore` | `ant` CLI isn't installed, so no OAuth-profile route; nothing ignores `.env` today. |
| Chat history | In-memory Zustand store, not persisted | Reload starts fresh; persistence is a later concern. |
| Dev workflow | `bun run dev` unchanged; new `bun run server` and `bun run dev:all` (concurrently) | Two processes, one command. |

**Branches:** Chunk 1 → `feat/cad-pan-zoom`; Chunk 2 → `feat/chat-pane` (off `main` after 1 merges).
Both land via PR with `--merge` (matches PR #1/#2). Always stage with `git add -A -- prototype-canvas docs`
— `main`'s working tree has unrelated dirty files under `.gstack/`.

---

# Chunk 1 — Land CAD pan/zoom + bottom-left undo/redo

Source of truth for the copied files: `WT=/Users/kavinnimalarajan/atomiser/.claude/worktrees/seamless-pan/prototype-canvas/src/canvas`.

## Task A0: Branch + plan doc

```bash
cd /Users/kavinnimalarajan/atomiser && git checkout main && git pull --ff-only && git checkout -b feat/cad-pan-zoom
```
Save this plan as `docs/superpowers/plans/2026-09-08-cad-pan-zoom-and-chat-pane.md`; commit
`docs: CAD pan/zoom landing + chat pane implementation plan`.

## Task A1: CAD-style wheel pan/zoom

**Files:** create `src/canvas/useCadPanZoom.ts` + `.test.ts` (verbatim copies); modify `src/canvas/Editor.tsx`.

1. `cp "$WT/useCadPanZoom.test.ts" src/canvas/` → `bun run test src/canvas/useCadPanZoom.test.ts` fails (module missing).
2. `cp "$WT/useCadPanZoom.ts" src/canvas/`, then apply the Editor diff from the worktree:
   ```bash
   cd /Users/kavinnimalarajan/atomiser
   git -C .claude/worktrees/seamless-pan diff -- prototype-canvas/src/canvas/Editor.tsx | git apply
   ```
   (Editor.tsx is byte-identical between the branch base and `main`, so this applies cleanly. It adds
   `useRef`, the `wrapRef` + `useCadPanZoom(wrapRef)` call, `ref={wrapRef}` on the wrapper div, and
   swaps `minZoom={0.25}` for `minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} panOnDrag={[0,1,2]}
   panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}
   preventScrolling={false}`.)
3. So this commit stands alone, remove the two `UndoRedo` lines the diff also added
   (`import { UndoRedo } from './UndoRedo';` and `<UndoRedo />`). Task A2 re-adds them.
4. `bun run test && bun run typecheck` → green.
5. Commit: `feat: CAD-style wheel pan/zoom (trackpad pans, wheel zooms)`.

## Task A2: Undo/redo moves to a bottom-left control

**Files:** create `src/canvas/UndoRedo.tsx` (rewritten, below) + `UndoRedo.test.tsx` (verbatim copy);
modify `src/canvas/Toolbar.tsx`, `src/canvas/Editor.tsx`.

1. `cp "$WT/UndoRedo.test.tsx" src/canvas/` → test fails (module missing).
2. `Toolbar.tsx:15` — `function ToolButton({` → `export function ToolButton({`. (Not exported today;
   reusing it keeps undo/redo's hover tooltip identical to the other buttons.)
3. Create `src/canvas/UndoRedo.tsx` — the worktree version, but built on `ToolButton`:
   ```tsx
   import { useStore } from 'zustand';
   import { useGraphStore } from '../store/graphStore';
   import { useSettings } from '../store/settingsStore';
   import { THEMES } from '../theme';
   import { ToolButton } from './Toolbar';

   // Dedicated undo/redo control, parked in the bottom-left corner (opposite the
   // zoom controls) rather than living in the node toolbar.
   export function UndoRedo() {
     const th = THEMES[useSettings((s) => s.theme)];
     const canUndo = useStore(useGraphStore.temporal, (t) => t.pastStates.length > 0);
     const canRedo = useStore(useGraphStore.temporal, (t) => t.futureStates.length > 0);
     return (
       <div
         className="absolute bottom-3 left-3 z-20 flex gap-1 rounded-lg border p-1 shadow-md"
         style={{ background: th.panel, borderColor: th.border }}
         onDoubleClick={(e) => e.stopPropagation()}
       >
         <ToolButton label="Undo" hint="⌘Z" disabled={!canUndo}
           onClick={() => useGraphStore.temporal.getState().undo()}
           color={canUndo ? th.text : th.faint} th={th}>↶</ToolButton>
         <ToolButton label="Redo" hint="⇧⌘Z" disabled={!canRedo}
           onClick={() => useGraphStore.temporal.getState().redo()}
           color={canRedo ? th.text : th.faint} th={th}>↷</ToolButton>
       </div>
     );
   }
   ```
   (Tooltip pops to the right (`left-full`), so hovering Undo briefly overlays Redo — it's
   `pointer-events-none` and transient; accepted rather than adding a placement prop.)
4. `Toolbar.tsx` — three removals, nothing else: line 2 `import { useStore } from 'zustand';`;
   lines 59–60 (`canUndo`/`canRedo` selectors); lines 91–110 (the Undo and Redo `<ToolButton>`
   blocks). Keep the divider, Auto-arrange, and Fit view.
5. `Editor.tsx` — re-add `import { UndoRedo } from './UndoRedo';` after the `Toolbar` import and
   `<UndoRedo />` right after `<Toolbar />`.
6. `bun run test && bun run typecheck` → green (Toolbar's tests never queried Undo/Redo).
7. Commit: `feat: move undo/redo into a bottom-left control`.

## Task A3: Browser verification, PR, merge, cleanup

1. `bun run dev` (background). Chrome MCP: new tab → `http://localhost:5173` → `javascript_tool`:
   ```js
   const pane = document.querySelector('.react-flow__pane');
   const r = pane.getBoundingClientRect();
   const at = { clientX: r.left + r.width/2, clientY: r.top + r.height/2, bubbles: true, cancelable: true, deltaMode: 0 };
   const vp = () => document.querySelector('.react-flow__viewport').style.transform;
   const tick = () => new Promise((res) => setTimeout(res, 100));
   const before = vp();
   pane.dispatchEvent(new WheelEvent('wheel', { ...at, deltaY: 100 }));        // integer ≥50, no deltaX → mouse wheel → zoom
   await tick(); const afterZoom = vp();
   pane.dispatchEvent(new WheelEvent('wheel', { ...at, deltaY: 3.5, deltaX: 1 })); // horizontal component → trackpad → pan
   await tick(); const afterPan = vp();
   const undo = document.querySelector('button[aria-label="Undo"]').getBoundingClientRect();
   ({ before, afterZoom, afterPan, undoLeft: undo.left, undoFromBottom: window.innerHeight - undo.bottom });
   ```
   Expect: `afterZoom` scale < `before` (≈ ×0.86); `afterPan` keeps that scale, translate shifts by
   (−1, −3.5); `undoLeft` / `undoFromBottom` ≈ 16 px. Screenshot. Console: nothing beyond the known
   React Flow nodeTypes StrictMode warning. **Never click the header `Clear` button in Chrome MCP —
   it opens a `confirm()` dialog that blocks the extension.**
2. `git push -u origin feat/cad-pan-zoom` → `gh pr create` (title
   `feat: CAD-style wheel pan/zoom + bottom-left undo/redo`; body: what it is + testing; end with the
   Claude Code footer) → `gh pr merge --merge --delete-branch` → `git checkout main && git pull --ff-only`.
3. Remove the stale worktree (it's dirty, so `--force`) and branch:
   ```bash
   git worktree remove --force .claude/worktrees/seamless-pan && git branch -D feat/seamless-pan && git worktree list
   ```

---

# Chunk 2 — Chat pane that just talks

## Task B1: `POST /api/chat` SSE endpoint (Hono + Anthropic)

**Files:** create `server/prompt.ts`, `server/app.ts`, `server/app.test.ts`; modify `package.json`/`bun.lock`, `tsconfig.json`.

1. Branch + deps + tsconfig:
   ```bash
   cd /Users/kavinnimalarajan/atomiser && git checkout main && git pull --ff-only && git checkout -b feat/chat-pane
   cd prototype-canvas && bun add hono@^4.13 @anthropic-ai/sdk@^0.124 && bun add -d concurrently
   ```
   `tsconfig.json`: `"include": ["src", "server"]`. (Leave `lib`/`types` alone; server code only
   needs `Request`/`Response`/`ReadableStream` from the DOM lib and never references `Bun` or
   `process`, so no extra type packages.)
2. Failing test `server/app.test.ts` — first line `// @vitest-environment node`. A `fakeStream(deltas)`
   that is async-iterable over `{ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }`
   events and has `finalMessage()` → `{ stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 5 } }`
   and `abort()`. `clientOf(stream)` → `{ beta: { messages: { stream } } }`. Post via
   `createApp({ client }).request('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body })`.
   Cases:
   - deltas `['Hel','lo','\nworld']` → 200, `content-type` contains `text/event-stream`, body contains
     `event: text\ndata: "Hel"\n\n`, `"Hel"` before `"lo"`, `data: "\\nworld"`, and ends with
     `event: done\ndata: {"stop_reason":"end_turn","usage":{"input_tokens":3,"output_tokens":5}}`.
   - `stream` throws `new Error('boom')` → 200 with `event: error\ndata: {"message":"boom"}\n\n`.
   - throws `new Anthropic.AuthenticationError(401, undefined, 'invalid x-api-key', new Headers())` →
     `event: error\ndata: {"message":"API key rejected"}\n\n`.
   - 400 for each of: `{}`, `{messages:[]}`, `{messages:[{role:'system',content:'x'}]}`,
     `{messages:[{role:'user',content:5}]}`, `{messages:[{role:'user',content:[{type:'text',text:'x'}]}]}`.

   No `vitest.config.ts` change: Vitest 4's default include glob covers `server/*.test.ts`, and
   `src/test/setup.ts` tolerates a node environment (every DOM touch is guarded or in try/catch).
3. `server/prompt.ts`:
   ```ts
   // System prompt for the chat pane. Short on purpose: the assistant has no
   // graph context or tools yet.
   export const SYSTEM_PROMPT = `You are Atomiser's planning assistant. Atomiser is a canvas where people break a project into a flowgraph of tasks, decisions, milestones and constraints. Help the user think through plans, sequencing and dependencies. You cannot see or edit the canvas yet; if asked, say so briefly. Be concise: short paragraphs, no preamble, no closing summary.`;
   ```
4. `server/app.ts`:
   ```ts
   import Anthropic from '@anthropic-ai/sdk';
   import { Hono } from 'hono';
   import { streamSSE } from 'hono/streaming';
   import { SYSTEM_PROMPT } from './prompt';

   // The slice of the Anthropic client this route needs. Narrow so tests can hand
   // in a fake; a real `Anthropic` instance satisfies it structurally.
   export type StreamParams = Parameters<Anthropic['beta']['messages']['stream']>[0];
   export interface ChatStream extends AsyncIterable<Anthropic.Beta.BetaRawMessageStreamEvent> {
     finalMessage(): Promise<{ stop_reason: string | null; usage: unknown }>;
     abort(): void;
   }
   export interface ChatClient {
     beta: { messages: { stream: (params: StreamParams) => ChatStream } };
   }

   const MODEL = 'claude-opus-5';
   const EFFORT = 'medium'; // a chat turn; graph-reasoning slices raise this

   // { messages: [{ role: 'user' | 'assistant', content: string }, …] } or null.
   function parseMessages(body: unknown): Anthropic.MessageParam[] | null {
     if (!body || typeof body !== 'object') return null;
     const { messages } = body as { messages?: unknown };
     if (!Array.isArray(messages) || messages.length === 0) return null;
     const out: Anthropic.MessageParam[] = [];
     for (const m of messages) {
       if (!m || typeof m !== 'object') return null;
       const { role, content } = m as { role?: unknown; content?: unknown };
       if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
       out.push({ role, content });
     }
     return out;
   }

   // Most-specific first; the SDK's typed classes carry the distinction.
   function describeError(err: unknown): string {
     if (err instanceof Anthropic.AuthenticationError) return 'API key rejected';
     if (err instanceof Anthropic.RateLimitError) return 'Rate limited — try again in a moment';
     if (err instanceof Anthropic.APIError) return `API error ${err.status ?? ''}: ${err.message}`.replace('  ', ' ');
     return err instanceof Error ? err.message : 'Unknown error';
   }

   export function createApp({ client }: { client: ChatClient }) {
     const app = new Hono();

     app.post('/api/chat', async (c) => {
       const messages = parseMessages(await c.req.json().catch(() => null));
       if (!messages) {
         return c.json({ error: 'Expected { messages: [{ role: "user" | "assistant", content: string }, …] }' }, 400);
       }

       // Headers go out as soon as streaming starts, so every failure — including
       // upstream API errors — is reported in-band as an `error` event.
       return streamSSE(c, async (stream) => {
         let upstream: ChatStream | null = null;
         stream.onAbort(() => upstream?.abort());
         try {
           upstream = client.beta.messages.stream({
             model: MODEL,
             max_tokens: 16000,
             system: SYSTEM_PROMPT,
             messages,
             output_config: { effort: EFFORT },
             betas: ['server-side-fallback-2026-07-01'],
             fallbacks: 'default',
           });
           for await (const ev of upstream) {
             if (stream.aborted) return;
             if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
               await stream.writeSSE({ event: 'text', data: JSON.stringify(ev.delta.text) });
             }
           }
           const final = await upstream.finalMessage();
           await stream.writeSSE({ event: 'done', data: JSON.stringify({ stop_reason: final.stop_reason, usage: final.usage }) });
         } catch (err) {
           if (!stream.aborted) {
             await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: describeError(err) }) });
           }
         }
       });
     });

     return app;
   }
   ```
5. `bun run test server/app.test.ts && bun run typecheck` → green. **Typing fallbacks:** if `tsc`
   rejects `fallbacks: 'default'`, use the documented array form
   (`betas: ['server-side-fallback-2026-06-01'], fallbacks: [{ model: 'claude-opus-4-8' }]`); if that
   is rejected too, keep the scalar form behind a one-line `// @ts-expect-error fallbacks is newer
   than the SDK typings` (the SDK forwards unknown body keys). If
   `Anthropic.Beta.BetaRawMessageStreamEvent` isn't exported under that name, find it under
   `Anthropic.Beta.Messages`.
6. Commit: `feat: /api/chat SSE endpoint (Hono + Anthropic, streamed text deltas)`.

## Task B2: Server entry, Vite proxy, scripts, secrets hygiene

**Files:** create `server/index.ts`; modify `package.json` (scripts), `vite.config.ts`, `.gitignore`, `.envrc` (local, gitignored).

1. `server/index.ts`:
   ```ts
   import Anthropic from '@anthropic-ai/sdk';
   import { createApp } from './app';

   // Zero-arg: the SDK reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) from the
   // environment. It does NOT throw when neither is set — auth would only fail on
   // the first request — so check up front and fail loudly instead.
   const client = new Anthropic();
   if (!client.apiKey && !client.authToken) {
     throw new Error(
       'ANTHROPIC_API_KEY is not set.\n' +
         'Add `export ANTHROPIC_API_KEY=sk-ant-…` to prototype-canvas/.envrc, run `direnv allow`, then re-run `bun run server`.',
     );
   }

   // Bun serves a default export that has `fetch` — no bun-types needed.
   export default { port: 8787, fetch: createApp({ client }).fetch };
   ```
2. `package.json` scripts — add `"server": "bun --watch server/index.ts"` and
   `"dev:all": "concurrently -n web,api \"bun run dev\" \"bun run server\""`; `dev` stays `vite`.
3. `vite.config.ts` — add `server: { proxy: { '/api': 'http://localhost:8787' } }`.
4. Append `.env` and `.env.*` to `prototype-canvas/.gitignore`. Append
   `export ANTHROPIC_API_KEY=sk-ant-…` to `prototype-canvas/.envrc` (the user supplies the key) and
   `direnv allow`.
5. Terminal checks:
   - Bad path (without `--watch`, or it would sit waiting after the crash):
     `env -u ANTHROPIC_API_KEY bun server/index.ts; echo "exit=$?"` → the instruction message, `exit=1`.
   - Good path: `bun run server &`, then `curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8787/api/chat -H 'content-type: application/json' -d '{}'` → `400`;
     `curl -N -X POST localhost:8787/api/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"Say OK."}]}'` → `event: text` lines then `event: done`.
6. Confirm `.envrc` is not in `git status --short -- prototype-canvas`, then commit:
   `feat: chat dev server entry, vite /api proxy, dev:all script`.

## Task B3: SSE parser

**Files:** create `src/chat/sse.ts`, `src/chat/sse.test.ts`.

1. Failing test — helpers `bytes(s)`, `streamOf(chunks)`, `collect(chunks)`, `chop(bytes, n)`. Wire
   `event: text\ndata: "Hel"\n\nevent: text\ndata: "lo"\n\nevent: done\ndata: {"stop_reason":"end_turn"}\n\n`
   must yield the three `{event,data}` records when delivered (a) whole, (b) chopped every 7 bytes,
   (c) chopped every 1 byte; (d) `data: "é"\n\n` split inside the 2-byte `é` still yields `"é"` with
   event `message`; (e) `data: a\ndata: b\n\n: ping\n\nevent: done\ndata: {}` (no trailing blank line)
   yields `{message, 'a\nb'}` then `{done, '{}'}`.
2. `src/chat/sse.ts`:
   ```ts
   export type SSEEvent = { event: string; data: string };

   // Minimal Server-Sent Events reader: yields one { event, data } per blank-line-
   // delimited block. Chunks may split a line (or a multi-byte character) anywhere;
   // multi-line `data:` fields join with "\n" per the spec; comments are skipped.
   export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
     const reader = body.getReader();
     const decoder = new TextDecoder();
     let buf = '';
     let event = 'message';
     let data: string[] = [];

     const flush = (): SSEEvent | null => {
       if (data.length === 0) return null;
       const out = { event, data: data.join('\n') };
       event = 'message';
       data = [];
       return out;
     };

     const handleLine = (raw: string): SSEEvent | null => {
       const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
       if (line === '') return flush();
       if (line.startsWith(':')) return null;
       const i = line.indexOf(':');
       const field = i === -1 ? line : line.slice(0, i);
       let value = i === -1 ? '' : line.slice(i + 1);
       if (value.startsWith(' ')) value = value.slice(1);
       if (field === 'event') event = value;
       else if (field === 'data') data.push(value);
       return null;
     };

     for (;;) {
       const { value, done } = await reader.read();
       buf += decoder.decode(value, { stream: !done });
       let nl: number;
       while ((nl = buf.indexOf('\n')) !== -1) {
         const ev = handleLine(buf.slice(0, nl));
         buf = buf.slice(nl + 1);
         if (ev) yield ev;
       }
       if (done) break;
     }
     if (buf) handleLine(buf); // last line without a newline
     const last = flush();
     if (last) yield last;
   }
   ```
3. Test + typecheck → commit `feat: SSE parser for the chat stream`.

## Task B4: `streamChat` + `chatStore`

**Files:** create `src/chat/streamChat.ts`, `src/store/chatStore.ts`, `src/store/chatStore.test.ts`.

1. Failing test — `vi.stubGlobal('fetch', …)` returning a `Response` whose body is a
   `ReadableStream` of SSE bytes (`afterEach(vi.unstubAllGlobals)`; `beforeEach` resets the store to
   `{ messages: [], streaming: false, error: null }`). Cases:
   - `send('  hi  ')` with `text "Hel"`, `text "lo"`, `done` → messages
     `[{user,'hi'},{assistant,'Hello'}]`, `streaming` false, `error` null; fetch called with
     `'/api/chat'` and body `{ messages: [{ role: 'user', content: 'hi' }] }` (the empty assistant
     placeholder is never POSTed — the API rejects empty content).
   - `error {"message":"API key rejected"}` → messages `[{user,'hi'}]` (placeholder dropped),
     `error` set, `streaming` false.
   - non-2xx `Response('{"error":"bad"}', { status: 400 })` → `error` matches `/400/`.
   - `send('   ')` and `send('hi')` while `streaming: true` → fetch never called.
2. `src/chat/streamChat.ts`:
   ```ts
   import type Anthropic from '@anthropic-ai/sdk';
   import { parseSSE } from './sse';

   export type ChatDone = { stop_reason: string | null; usage: unknown };
   export type StreamChatOptions = { onText: (delta: string) => void; signal?: AbortSignal };

   // POST the transcript to the key-holding server and dispatch its SSE events.
   export async function streamChat(
     messages: Anthropic.MessageParam[],
     { onText, signal }: StreamChatOptions,
   ): Promise<ChatDone> {
     const res = await fetch('/api/chat', {
       method: 'POST',
       headers: { 'content-type': 'application/json' },
       body: JSON.stringify({ messages }),
       signal,
     });
     if (!res.ok || !res.body) {
       const detail = await res.text().catch(() => '');
       throw new Error(`Chat request failed (${res.status})${detail ? `: ${detail}` : ''}`);
     }
     for await (const ev of parseSSE(res.body)) {
       if (ev.event === 'text') onText(JSON.parse(ev.data) as string);
       else if (ev.event === 'done') return JSON.parse(ev.data) as ChatDone;
       else if (ev.event === 'error') throw new Error((JSON.parse(ev.data) as { message: string }).message);
     }
     throw new Error('Stream ended before the reply finished');
   }
   ```
3. `src/store/chatStore.ts`:
   ```ts
   import type Anthropic from '@anthropic-ai/sdk';
   import { create } from 'zustand';
   import { streamChat } from '../chat/streamChat';

   // Chat transcript. Not persisted (yet): a reload starts fresh. Content is always
   // a plain string here; MessageParam is the SDK's wire type (type-only import —
   // erased at build) so the transcript goes to /api/chat untouched.
   interface ChatState {
     messages: Anthropic.MessageParam[];
     streaming: boolean;
     error: string | null;
     send: (text: string) => Promise<void>;
     clear: () => void;
   }

   export const useChatStore = create<ChatState>()((set, get) => ({
     messages: [],
     streaming: false,
     error: null,

     send: async (text) => {
       const content = text.trim();
       if (!content || get().streaming) return;

       // Only real turns go to the API — the empty assistant placeholder is local
       // UI state (the API rejects empty content).
       const history: Anthropic.MessageParam[] = [...get().messages, { role: 'user', content }];
       set({ messages: [...history, { role: 'assistant', content: '' }], streaming: true, error: null });

       const appendDelta = (delta: string) =>
         set((s) => {
           const messages = s.messages.slice();
           const last = messages[messages.length - 1];
           if (last?.role === 'assistant' && typeof last.content === 'string') {
             messages[messages.length - 1] = { role: 'assistant', content: last.content + delta };
           }
           return { messages };
         });

       try {
         await streamChat(history, { onText: appendDelta });
         set({ streaming: false });
       } catch (err) {
         set((s) => {
           const messages = s.messages.slice();
           const last = messages[messages.length - 1];
           if (last?.role === 'assistant' && last.content === '') messages.pop();
           return { messages, streaming: false, error: err instanceof Error ? err.message : String(err) };
         });
       }
     },

     clear: () => set({ messages: [], error: null }),
   }));
   ```
4. Test + typecheck → commit `feat: chat store streams replies from /api/chat`.

## Task B5: `ChatPane` component + `chatOpen` UI state

**Files:** create `src/chat/ChatPane.tsx`, `src/chat/ChatPane.test.tsx`; modify `src/store/uiStore.ts`.

1. Failing test (`beforeEach`: `localStorage.clear()`, reset chat store, `useUiStore.setState({ chatOpen: true })`):
   - typing `hello` in the `Message` textbox + Enter calls a stubbed `send` (`useChatStore.setState({ send })`)
     with `'hello'` and clears the box;
   - Shift+Enter does not send and keeps the text;
   - `error: 'API key rejected'` renders in a `role="alert"`;
   - `streaming: true` with a trailing empty assistant message shows `…` and disables the textbox;
   - clicking `Collapse chat` sets `chatOpen` false.
2. `uiStore.ts` — add `chatOpen: boolean` (default `true`) and `toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen }))`.
3. `src/chat/ChatPane.tsx` — themed `<aside className="flex w-[400px] shrink-0 flex-col border-r">`
   (`background: th.app`, `borderColor: th.border`, `color: th.text`):
   - header (`h-10`, border-b): uppercase tracked `Chat` label in `th.subtext` using
     `${font.caption} text-[9px] tracking-[0.24em] uppercase`; `aria-label="Collapse chat"` ✕ button
     (`th.faint`) → `toggleChat`.
   - thread `div` (`ref`, `min-h-0 flex-1 overflow-y-auto px-4 py-3`): empty-state hint in `th.faint`
     ("Ask anything about the plan. The assistant can't see the canvas yet."); each message = role
     label (`You` / `Assistant`, same uppercase style in `th.faint`) + body
     (`text-[13px] leading-relaxed whitespace-pre-wrap`); the last assistant message renders `…` while
     `streaming` and its content is still `''`; error line `role="alert"` in `th.status.blocked`.
     Auto-scroll in a `useEffect([messages])` by setting `el.scrollTop = el.scrollHeight`
     (**not** `scrollTo` — jsdom lacks it).
   - composer (`border-t p-3`): `<textarea aria-label="Message" rows={3}>` bound to local `draft`;
     `onKeyDown` Enter-without-Shift → `preventDefault` + submit (trim, ignore empty/streaming, clear
     draft, `void send(text)`); `disabled={streaming}`; placeholder `Thinking…` while streaming else
     `Message — Enter to send, Shift+Enter for a newline`; styled `th.card` / `th.cardBorder`.
   - `useHistoryShortcuts` already defers ⌘Z to focused `TEXTAREA`s, so typing never undoes the graph.
4. Test + full suite + typecheck → commit `feat: ChatPane component (thread, composer, typing indicator)`.

## Task B6: Dock the pane; header toggle; browser verification

**Files:** modify `src/App.tsx`.

1. Imports: `import { ChatPane } from './chat/ChatPane';` and `import { useUiStore } from './store/uiStore';`.
   Selectors after `const font = …`: `chatOpen` and `toggleChat` from `useUiStore`.
2. Header — first child of the existing `<div className="ml-auto flex items-center gap-2 text-[12px]">`
   (before `Clear`; the IDE / `Agent · soon` pill is untouched):
   ```tsx
   <button aria-label="Toggle chat" aria-pressed={chatOpen} onClick={toggleChat}
     className="rounded border px-2 py-1"
     style={{ borderColor: chatOpen ? th.accent : th.cardBorder, color: chatOpen ? th.text : th.subtext }}>
     Chat
   </button>
   ```
3. Body — replace `App.tsx:76-79` with a flex row; the canvas container keeps `relative` (Toolbar /
   UndoRedo / NodeDrawer are absolute inside it and shift with it) and gains `min-w-0`:
   ```tsx
   <div className="flex min-h-0 flex-1">
     {chatOpen && <ChatPane />}
     <div className="relative min-h-0 min-w-0 flex-1">
       <Editor />
       <NodeDrawer />
     </div>
   </div>
   ```
4. `bun run test && bun run typecheck && bun run build`; then `grep -rl anthropic dist/assets | wc -l`
   → `0` (the SDK is type-only on the client).
5. Browser verification — from a direnv-loaded shell:
   `lsof -ti:5173,8787 | xargs kill 2>/dev/null; bun run dev:all` (background). Chrome MCP:
   - `javascript_tool`: `aside` rect is 400 wide at `left 0`; `.react-flow` rect starts ≈ 400 and ends
     at `window.innerWidth`. Screenshot.
   - `find` the `Message` textbox → click → type `hello` → Enter. `get_page_text` a few times: an
     `Assistant` label with `…`, then growing text. Screenshots mid-stream and at the end.
     `read_network_requests`: `POST /api/chat` → 200 `text/event-stream`.
   - `find` `Toggle chat` → click → `document.querySelector('aside')` is `null`, `.react-flow` left ≈ 0
     (Toolbar hugs the left edge). Click again → pane returns with the transcript intact (store
     survives unmount).
   - `read_console_messages`: nothing beyond the known React Flow nodeTypes StrictMode warning.
     **Do not click `Clear`** (`confirm()` dialog).
6. Commit: `feat: chat pane docked left of the canvas, collapsible from the header`.

## Task B7: NOTES.md, PR, merge

1. `NOTES.md` — **Run** line becomes: `bun install`, put `export ANTHROPIC_API_KEY=sk-ant-…` in
   `.envrc` (`direnv allow`), then `bun run dev:all` (web :5173, chat API :8787) — or `bun run dev`
   and `bun run server` in two terminals; the server refuses to start without the key. Directory map:
   mention `chatStore` (not persisted) on the store line and add
   `src/chat/` (pane, SSE parser, `/api/chat` client — no graph awareness yet) and
   `server/` (minimal Bun/Hono key-holder; not the spec's full stack).
2. Commit `docs: run instructions for the chat server`; push; `gh pr create` (title
   `feat: chat pane that streams Claude replies (no graph awareness yet)`; body summarising server /
   client / shell / dev changes and the test + browser evidence; Claude Code footer);
   `gh pr merge --merge --delete-branch`; `git checkout main && git pull --ff-only`.

---

## Verification summary

- **Automated:** `bun run test` grows by ≈ 4 (wheel classifier) + 2 (UndoRedo) + 4 (server route) +
  4 (SSE parser) + 4 (chat store) + 5 (ChatPane); `bun run typecheck` now covers `server/`;
  `bun run build` has no SDK chunk.
- **Terminal:** server without key → instruction + exit 1; `curl` → 400 on bad body, SSE on good.
- **Browser (Chrome MCP):** Chunk 1 — synthetic wheel zooms vs. trackpad pans, UndoRedo bottom-left.
  Chunk 2 — 400 px pane on the left, canvas fills the rest, `hello` streams a reply, toggle
  collapses/expands with transcript intact, no console errors.

## Follow-ups (deliberately out of scope)

- `Toolbar.create()` centres new nodes on `window.innerWidth / 2`; with the pane open that is 200 px
  left of the canvas centre (still on-canvas). Fix later by using the canvas wrapper's rect.
- `useCadPanZoom` only excludes React Flow panels from wheel capture, so wheeling over the
  Toolbar/UndoRedo pans the canvas — pre-existing worktree behaviour.
- Persisting the chat transcript; a keyboard shortcut for the pane toggle.
