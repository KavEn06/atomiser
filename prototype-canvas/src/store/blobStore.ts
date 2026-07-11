import { createStore, del, get, set } from 'idb-keyval';
import { nanoid } from 'nanoid';

const store = createStore('atomiser-blobs', 'blobs');

export async function putBlob(file: Blob): Promise<string> {
  const id = `img_${nanoid(10)}`;
  await set(id, file, store);
  return id;
}

export async function getBlobUrl(id: string): Promise<string | null> {
  const blob = await get<Blob>(id, store);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteBlob(id: string): Promise<void> {
  await del(id, store);
}
