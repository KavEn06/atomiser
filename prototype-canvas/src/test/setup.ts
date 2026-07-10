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
