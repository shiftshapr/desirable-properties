'use client';

import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

export default function BroadcastRichEditor({ value, onChange, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const syncingRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      readOnly: Boolean(disabled),
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean'],
          ],
          handlers: {
            image: () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/png,image/jpeg,image/gif';
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append('file', file);
                try {
                  const res = await fetch('/api/admin/broadcast/images', {
                    method: 'POST',
                    credentials: 'include',
                    body: form,
                  });
                  const data = await res.json();
                  if (!res.ok || !data.ok || !data.url) {
                    throw new Error(data.message || 'Image upload failed');
                  }
                  const range = quill.getSelection(true);
                  const index = range ? range.index : Math.max(0, quill.getLength() - 1);
                  quill.insertEmbed(index, 'image', data.url, 'user');
                  quill.setSelection(index + 1, 0, 'user');
                } catch (err) {
                  window.alert(err instanceof Error ? err.message : 'Image upload failed');
                }
              };
              input.click();
            },
          },
        },
      },
    });

    quill.on('text-change', () => {
      if (syncingRef.current) return;
      onChangeRef.current(quill.root.innerHTML);
    });

    if (value) {
      syncingRef.current = true;
      quill.clipboard.dangerouslyPasteHTML(value);
      syncingRef.current = false;
    }

    quillRef.current = quill;

    return () => {
      quillRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [disabled]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    const current = quill.root.innerHTML;
    if (value !== current) {
      syncingRef.current = true;
      quill.clipboard.dangerouslyPasteHTML(value || '');
      syncingRef.current = false;
    }
  }, [value]);

  useEffect(() => {
    quillRef.current?.enable(!disabled);
  }, [disabled]);

  return (
    <div className="broadcast-rich-editor rounded-md border border-slate-700 bg-slate-950 text-white [&_.ql-toolbar]:rounded-t-md [&_.ql-toolbar]:border-slate-700 [&_.ql-toolbar]:bg-slate-900 [&_.ql-container]:min-h-[180px] [&_.ql-container]:rounded-b-md [&_.ql-container]:border-slate-700 [&_.ql-editor]:min-h-[180px] [&_.ql-editor_img]:max-w-full">
      <div ref={containerRef} />
    </div>
  );
}
