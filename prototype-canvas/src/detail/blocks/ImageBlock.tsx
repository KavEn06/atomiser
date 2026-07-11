import { useEffect, useState } from 'react';
import type { ImageBlock as ImageBlockT } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { getBlobUrl, putBlob } from '../../store/blobStore';

export function ImageBlock({ nodeId, block }: { nodeId: string; block: ImageBlockT }) {
  const updateBlock = useGraphStore((s) => s.updateBlock);
  const [url, setUrl] = useState<string | null>(block.src ?? null);

  useEffect(() => {
    let revoke: string | null = null;
    if (block.src) {
      setUrl(block.src);
    } else if (block.blobId) {
      getBlobUrl(block.blobId).then((u) => {
        setUrl(u);
        revoke = u;
      });
    } else {
      setUrl(null);
    }
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [block.src, block.blobId]);

  const onFile = async (file: File) => {
    const blobId = await putBlob(file);
    updateBlock(nodeId, block.id, { blobId, src: undefined });
  };

  return (
    <div className="space-y-2">
      {url ? (
        <img src={url} alt={block.caption ?? ''} className="max-h-64 max-w-full rounded" />
      ) : (
        <div className="rounded border border-dashed border-stone-300 p-4 text-center text-[12px] text-stone-400">
          Upload a file or paste an image URL
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <label className="cursor-pointer rounded border border-stone-300 px-2 py-1">
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        <input
          placeholder="…or paste image URL"
          defaultValue={block.src ?? ''}
          onBlur={(e) =>
            updateBlock(nodeId, block.id, { src: e.target.value.trim() || undefined, blobId: undefined })
          }
          className="min-w-0 flex-1 rounded border border-stone-300 bg-transparent px-2 py-1 focus:outline-none"
        />
      </div>
      <input
        placeholder="Caption (optional)"
        defaultValue={block.caption ?? ''}
        onBlur={(e) => updateBlock(nodeId, block.id, { caption: e.target.value.trim() || undefined })}
        className="w-full rounded border border-stone-300 bg-transparent px-2 py-1 text-[12px] focus:outline-none"
      />
    </div>
  );
}
