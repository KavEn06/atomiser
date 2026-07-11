import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom lacks these; block components call them.
if (!('createObjectURL' in URL)) {
  // @ts-expect-error jsdom stub
  URL.createObjectURL = () => 'blob:stub';
}
if (!('revokeObjectURL' in URL)) {
  // @ts-expect-error jsdom stub
  URL.revokeObjectURL = () => {};
}

// --- React Flow needs measurement/layout primitives jsdom doesn't provide.
//     This is React Flow's documented test-mock set (see their Jest testing guide). ---

class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { width: 500, height: 500 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;

class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
    this.m22 = scale !== undefined ? +scale : 1;
  }
}
// @ts-expect-error jsdom stub
globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock;

try {
  Object.defineProperties(globalThis.HTMLElement.prototype, {
    offsetHeight: {
      configurable: true,
      get(this: HTMLElement) {
        return parseFloat(this.style.height) || 1;
      },
    },
    offsetWidth: {
      configurable: true,
      get(this: HTMLElement) {
        return parseFloat(this.style.width) || 1;
      },
    },
  });
} catch {
  // already defined — fine
}

if (globalThis.SVGElement) {
  // @ts-expect-error jsdom stub
  globalThis.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  // @ts-expect-error jsdom stub — Recharts measures text
  globalThis.SVGElement.prototype.getComputedTextLength = () => 0;
}

// --- Tiptap / ProseMirror measurement in jsdom ---
if (!globalThis.matchMedia) {
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  });
}
if (globalThis.Range) {
  if (!Range.prototype.getClientRects) {
    // @ts-expect-error jsdom stub
    Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
  }
  if (!Range.prototype.getBoundingClientRect) {
    // @ts-expect-error jsdom stub
    Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 });
  }
}
if (globalThis.document && !document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
