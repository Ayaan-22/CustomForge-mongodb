"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { rememberSearch, type SearchChoice } from "./search-types";

// The results module and its product/media dependencies load only on focus.
const SearchSuggestions = dynamic(() => import("./search-suggestions"), {
  ssr: false,
  loading: () => (
    <div className="forge-search-feedback" role="status">
      <Loader2 size={18} className="forge-search-spinner" aria-hidden="true" />{" "}
      Preparing search…
    </div>
  ),
});

export function SearchField({
  value,
  onChange,
  onNavigate,
}: {
  value: string;
  onChange: (query: string) => void;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `forge-search-${id}`;
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState(false);
  const [choices, setChoices] = useState<SearchChoice[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const receiveChoices = useCallback((next: SearchChoice[]) => {
    setChoices(next);
    setActiveIndex(-1);
  }, []);
  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }
  function navigate(choice: SearchChoice, event?: React.MouseEvent) {
    rememberSearch(choice.kind === "recent" ? choice.label : value);
    if (
      event &&
      (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    )
      return;
    event?.preventDefault();
    close();
    if (choice.kind === "recent") onChange(choice.label);
    else if (choice.kind === "product" || choice.kind === "category")
      onChange("");
    onNavigate();
    router.push(choice.href);
    input.current?.blur();
  }
  return (
    <div
      className="forge-search-discovery"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
      }}
    >
      <form
        role="search"
        className="forge-search"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim())
            navigate({
              id: "submit",
              kind: "all",
              label: value.trim(),
              href: `/search?q=${encodeURIComponent(value.trim())}`,
            });
        }}
      >
        <Search size={17} aria-hidden="true" />
        <input
          ref={input}
          value={value}
          maxLength={120}
          placeholder="Search your next upgrade…"
          aria-label="Search products"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open && choices.length > 0 ? listId : undefined}
          aria-activedescendant={
            open && activeIndex >= 0 && choices[activeIndex]
              ? `${listId}-${choices[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          onFocus={() => {
            setIntent(true);
            setOpen(true);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setChoices([]);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (
              (event.ctrlKey || event.metaKey) &&
              event.key.toLowerCase() === "k"
            ) {
              event.preventDefault();
              setIntent(true);
              setOpen(true);
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setIntent(true);
              if (choices.length)
                setActiveIndex((index) =>
                  event.key === "ArrowDown"
                    ? (index + 1) % choices.length
                    : index <= 0
                      ? choices.length - 1
                      : index - 1,
                );
            } else if (
              event.key === "Enter" &&
              open &&
              activeIndex >= 0 &&
              choices[activeIndex]
            ) {
              event.preventDefault();
              navigate(choices[activeIndex]);
            }
          }}
        />
        <kbd className="hidden lg:block">Ctrl K</kbd>
        <button type="submit" aria-label="Submit product search">
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
      {intent && open && (
        <div className="forge-search-panel">
          <SearchSuggestions
            query={value}
            listId={listId}
            activeIndex={activeIndex}
            onChoices={receiveChoices}
            onActiveIndex={setActiveIndex}
            onSelect={navigate}
          />
        </div>
      )}
    </div>
  );
}
