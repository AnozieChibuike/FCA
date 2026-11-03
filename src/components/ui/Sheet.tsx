import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Bottom sheet on phones, centred dialog on larger screens. */
export default function Sheet({ open, onClose, title, children, footer, wide = false }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-fade-in" aria-label="Close" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-chess-border bg-surface shadow-2xl outline-none animate-sheet-up sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-chess-border sm:hidden" />
        <div className="flex items-center justify-between gap-3 border-b border-chess-border px-4 py-3 sm:px-5">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="border-t border-chess-border px-4 py-3 pb-safe sm:px-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
