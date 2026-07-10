import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// React Flow measures nodes with ResizeObserver, which jsdom lacks.
if (!('ResizeObserver' in globalThis)) {
  // @ts-expect-error jsdom stub
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom lacks these; block components call them.
if (!('createObjectURL' in URL)) {
  // @ts-expect-error jsdom stub
  URL.createObjectURL = () => 'blob:stub';
}
if (!('revokeObjectURL' in URL)) {
  // @ts-expect-error jsdom stub
  URL.revokeObjectURL = () => {};
}
