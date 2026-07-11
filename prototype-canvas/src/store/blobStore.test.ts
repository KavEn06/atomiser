import { describe, expect, it, vi } from 'vitest';
import { deleteBlob, getBlobUrl, putBlob } from './blobStore';

describe('blobStore', () => {
  it('putBlob returns an img_ id and getBlobUrl resolves it', async () => {
    const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:abc');
    const id = await putBlob(new Blob(['hi'], { type: 'text/plain' }));
    expect(id).toMatch(/^img_/);
    expect(await getBlobUrl(id)).toBe('blob:abc');
    spy.mockRestore();
  });

  it('getBlobUrl returns null for a missing id', async () => {
    expect(await getBlobUrl('img_missing')).toBeNull();
  });

  it('deleteBlob removes the blob', async () => {
    const id = await putBlob(new Blob(['x']));
    await deleteBlob(id);
    expect(await getBlobUrl(id)).toBeNull();
  });
});
