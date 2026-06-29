"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

interface DropdownCtxValue {
  close: () => void;
}
const DropdownCtx = createContext<DropdownCtxValue>({ close: () => {} });

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, x: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function close() { setOpen(false); }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!triggerRef.current) return;
    if (open) { close(); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      x: align === "right" ? window.innerWidth - rect.right : rect.left,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <DropdownCtx.Provider value={{ close }}>
      <div ref={triggerRef} onClick={handleToggle}>
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              ...(align === "right" ? { right: pos.x } : { left: pos.x }),
              zIndex: 9999,
            }}
            className="min-w-[140px] rounded-lg border border-line bg-surface py-1 shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </DropdownCtx.Provider>
  );
}

export function DropdownItem({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { close } = useContext(DropdownCtx);
  return (
    <button
      disabled={disabled}
      onClick={() => { onClick?.(); close(); }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-sand disabled:opacity-30",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-line" />;
}
