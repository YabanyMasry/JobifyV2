import { useEffect, useRef, useState } from "react";
import { type Profile, profileDisplayName } from "../types";

type Props = {
  profiles: Profile[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function ProfileSwitcher({
  profiles,
  activeId,
  onSwitch,
  onCreate,
  onDuplicate,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const canDelete = profiles.length > 1;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-3 border-2 border-black bg-white px-4 py-2 font-mono font-bold text-black brutal-shadow-sm transition-transform hover:bg-black hover:text-white max-w-[280px]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="bg-[#eab308] text-black px-1.5 py-0.5 text-xs border border-black">REF</span>
        <span className="truncate uppercase">{profileDisplayName(active)}</span>
        <span aria-hidden className={`text-xl leading-none transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 border-4 border-black bg-white brutal-shadow z-40">
          <div className="max-h-[60vh] overflow-y-auto">
            {profiles.map((p) => {
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSwitch(p.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b-2 border-black flex items-center gap-3 font-mono font-bold uppercase transition-colors ${
                    isActive ? "bg-black text-white" : "bg-white text-black hover:bg-[#eab308]"
                  }`}
                >
                  <span className={`text-sm ${isActive ? "text-[#eab308]" : "text-black"}`}>
                    {isActive ? "[X]" : "[ ]"}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate">{profileDisplayName(p)}</div>
                    {p.fullName && p.label && (
                      <div className="text-xs truncate opacity-70">{p.fullName}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="bg-slate-100 p-2 border-t-4 border-black space-y-1">
            <MenuAction onClick={() => { onCreate(); setOpen(false); }}>
              [+] NEW_PROFILE
            </MenuAction>
            <MenuAction onClick={() => { onDuplicate(); setOpen(false); }}>
              [=] CLONE_CURRENT
            </MenuAction>
            <MenuAction
              disabled={!canDelete}
              destructive
              onClick={() => {
                if (!canDelete) return;
                if (window.confirm(`PURGE "${profileDisplayName(active)}"? CANNOT BE UNDONE.`)) {
                  onDelete();
                  setOpen(false);
                }
              }}
            >
              {canDelete ? "[!] PURGE_CURRENT" : "[!] PURGE_LOCKED (MIN: 2)"}
            </MenuAction>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuAction({
  onClick,
  disabled,
  destructive,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 font-mono font-bold text-sm uppercase transition-colors ${
        disabled ? "opacity-30 cursor-not-allowed bg-transparent" :
        destructive ? "text-red-600 hover:bg-red-600 hover:text-white" : "text-black hover:bg-black hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
