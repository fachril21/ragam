"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { Input, cn } from "@/components/ui";
import { ShippingFallback } from "./ShippingFallback";
import {
  MIN_QUERY_LENGTH,
  useDestinationSearch,
  type DestinationItem,
} from "./useDestinationSearch";

export const STORAGE_KEY = "ragam:destination";

interface DestinationPickerProps {
  onSelect: (destination: DestinationItem | null) => void;
  label?: string;
  whatsappText?: string;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Raw stored string (a primitive, so the snapshot is stable between renders). */
function getSnapshot(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): DestinationItem | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DestinationItem>;
    return typeof value.id === "string" && typeof value.label === "string"
      ? { id: value.id, label: value.label, city: value.city ?? "", province: value.province ?? "" }
      : null;
  } catch {
    return null;
  }
}

function writeStored(value: DestinationItem | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the picker still works, it just will not persist.
  }
  listeners.forEach((listener) => listener());
}

/** Destination autocomplete following the ARIA combobox pattern (E4-US1). */
export function DestinationPicker({
  onSelect,
  label = "Kota / kecamatan tujuan",
  whatsappText,
}: DestinationPickerProps) {
  const listId = useId();
  // undefined = the user has not touched it yet, so fall back to the stored choice (E28).
  const [typed, setTyped] = useState<string | undefined>(undefined);
  const [choice, setChoice] = useState<DestinationItem | null | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const storedRaw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const selected = choice === undefined ? parseStored(storedRaw) : choice;
  const text = typed ?? selected?.label ?? "";

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });
  // Tell the parent about a choice restored from storage.
  useEffect(() => {
    const restored = parseStored(storedRaw);
    if (restored) onSelectRef.current(restored);
  }, [storedRaw]);

  const search = useDestinationSearch(selected ? "" : text);
  const showList = isOpen && search.status === "ready";
  const optionId = (index: number) => `${listId}-option-${index}`;

  function choose(option: DestinationItem) {
    setChoice(option);
    setTyped(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
    writeStored(option);
    onSelect(option);
  }

  function handleChange(value: string) {
    setTyped(value);
    setIsOpen(true);
    setActiveIndex(-1);
    if (selected) {
      setChoice(null);
      writeStored(null);
      onSelect(null);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = search.options.length;
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "ArrowDown" && count > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % count);
    } else if (event.key === "ArrowUp" && count > 0) {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === "Enter" && showList && activeIndex >= 0) {
      event.preventDefault();
      choose(search.options[activeIndex]);
    }
  }

  const canFallback =
    search.status === "error" &&
    search.errorCode !== "INVALID_INPUT" &&
    search.errorCode !== "RATE_LIMITED";

  return (
    <div className="relative">
      <Input
        label={label}
        value={text}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        hint={`Ketik minimal ${MIN_QUERY_LENGTH} huruf nama kota atau kecamatan.`}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="border-border bg-background absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-lg"
        >
          {search.options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center px-3 py-2 text-sm",
                index === activeIndex ? "bg-surface" : "hover:bg-surface",
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      <div role="status" aria-live="polite" className="text-text-muted mt-1 min-h-5 text-xs">
        {search.status === "loading" && "Mencari tujuan…"}
        {search.status === "empty" &&
          "Tidak ada tujuan yang cocok. Coba nama kota atau kecamatan lain."}
      </div>

      {search.status === "error" &&
        (canFallback ? (
          <ShippingFallback message={search.message ?? ""} whatsappText={whatsappText} />
        ) : (
          <p role="alert" className="text-error text-sm">
            {search.message}
          </p>
        ))}
    </div>
  );
}
