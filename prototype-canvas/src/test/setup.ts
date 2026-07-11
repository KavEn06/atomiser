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
