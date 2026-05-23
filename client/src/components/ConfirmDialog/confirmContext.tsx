import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialogViewport } from "./ConfirmDialogViewport";
import "./ConfirmDialog.css";

export type ConfirmVariant = "default" | "danger";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

type PendingConfirm = ConfirmOptions & {
  id: string;
  resolve: (confirmed: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

function normalizeOptions(options: ConfirmOptions | string): ConfirmOptions {
  if (typeof options === "string") {
    return { message: options };
  }
  return options;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const idPrefix = useId();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(confirmed);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions | string) => {
      const normalized = normalizeOptions(options);
      return new Promise<boolean>((resolve) => {
        const entry: PendingConfirm = {
          ...normalized,
          id: `${idPrefix}-${Date.now()}`,
          resolve,
        };
        pendingRef.current = entry;
        setPending(entry);
      });
    },
    [idPrefix],
  );

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialogViewport pending={pending} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
