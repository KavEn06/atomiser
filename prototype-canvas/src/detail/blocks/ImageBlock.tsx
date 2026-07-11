import { useEffect, useState } from 'react';
import type { ImageBlock as ImageBlockT } from '../../schema';
import { useGraphStore } from '../../store/graphStore';
import { getBlobUrl, putBlob } from '../../store/blobStore';
import { useSettings } from '../../store/settingsStore';
import { THEMES } from '../../theme';

export function ImageBlock({ nodeId, block }: { nodeId: string; block: ImageBlockT }) {
  const updateBlock = useGraphStore((s) => s.updateBlock);
  const th = THEMES[useSettings((s) => s.theme)];
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

  const inputStyle = { borderColor: th.cardBorder, color: th.text };

  return (
    <div className="space-y-2">
      {url ? (
        <img src={url} alt={block.caption ?? ''} className="max-h-64 max-w-full rounded" />
      ) : (
        <div
          className="rounded border border-dashed p-4 text-center text-[12px]"
          style={{ borderColor: th.cardBorder, color: th.faint }}
        >
          Upload a file or paste an image URL
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <label className="cursor-pointer rounded border px-2 py-1" style={{ borderColor: th.cardBorder, color: th.text }}>
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
          className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 focus:outline-none"
          style={inputStyle}
        />
      </div>
      <input
        placeholder="Caption (optional)"
        defaultValue={block.caption ?? ''}
        onBlur={(e) => updateBlock(nodeId, block.id, { caption: e.target.value.trim() || undefined })}
        className="w-full rounded border bg-transparent px-2 py-1 text-[12px] focus:outline-none"
        style={inputStyle}
      />
    </div>
  );
}
