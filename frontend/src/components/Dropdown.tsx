import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  dividerBefore?: boolean;
}

export function Dropdown({
  trigger,
  options,
  value,
  onSelect,
  align = 'right',
  widthClass = 'min-w-[180px]',
  header,
}: {
  trigger: (open: boolean) => React.ReactNode;
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  align?: 'left' | 'right';
  widthClass?: string;
  header?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block min-w-0 text-left">
      <div onClick={() => setOpen((o) => !o)} className="inline-flex max-w-full">
        {trigger(open)}
      </div>
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 ${widthClass} origin-top max-h-[70vh] overflow-y-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-zinc-950/8 z-50`}
          role="menu"
        >
          {header && <div className="px-3 py-2 border-b border-zinc-100">{header}</div>}
          {options.map((opt) => {
            const active = value !== undefined && opt.value === value;
            return (
              <React.Fragment key={opt.value}>
                {opt.dividerBefore && <div className="my-1 border-t border-zinc-100" />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onSelect(opt.value);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] transition-colors cursor-pointer ${
                    opt.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : active
                        ? 'bg-indigo-50/70 text-indigo-700 font-medium'
                        : 'text-zinc-700 hover:bg-zinc-100/80'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {opt.sublabel && <span className="text-[11px] text-zinc-400">{opt.sublabel}</span>}
                    {active && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
