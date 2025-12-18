// src/components/AddressInput.tsx
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    ymaps?: any;
  }
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  placeholder = "Адрес",
  className = "",
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!window.ymaps) return;

    window.ymaps.ready(() => {
      if (!inputRef.current) return;

      const suggestView = new window.ymaps.SuggestView(inputRef.current, {
        results: 5,
      });

      suggestView.events.add("select", (e: any) => {
        const addr = e.get("item").value as string;
        onChange(addr);
      });
    });
  }, [onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        className ||
        "w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      }
    />
  );
}
