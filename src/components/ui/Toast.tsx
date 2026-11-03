import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem { id: number; tone: Tone; text: string }

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, tone, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl animate-sheet-up ${
              t.tone === 'error'
                ? 'border-red-500/40 bg-[#2a1414] text-red-200'
                : t.tone === 'info'
                  ? 'border-chess-border bg-[#1E1C18] text-white'
                  : 'border-primary/40 bg-[#1b2414] text-white'
            }`}
          >
            {t.tone === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              : t.tone === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
