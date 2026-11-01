"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLanguage, type SupportedLanguage } from "@/features/i18n/LanguageContext";

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className = "" }: LanguageSelectorProps) {
  const { language, setLanguage, languages, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const currentOption = languages.find((l) => l.code === language) || languages[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Sync focused index when opening
  useEffect(() => {
    if (open) {
      const idx = languages.findIndex((l) => l.code === language);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [open, language, languages]);

  // Focus keyboard target
  useEffect(() => {
    if (open && focusedIndex >= 0 && itemsRef.current[focusedIndex]) {
      itemsRef.current[focusedIndex]?.focus();
    }
  }, [open, focusedIndex]);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % languages.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + languages.length) % languages.length);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  function handleSelect(code: SupportedLanguage) {
    setLanguage(code);
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("nav.language")}: ${currentOption.label}`}
        className="flex h-10 items-center gap-2 rounded-full border border-line bg-card/80 px-3 text-xs font-medium text-ink transition hover:border-cobalt/40 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2"
      >
        {/* Globe icon */}
        <svg
          className="h-4 w-4 shrink-0 text-mute"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <path d="M2 12h20" />
        </svg>

        {compact ? (
          <span className="font-semibold uppercase tracking-wider">{currentOption.code}</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="font-semibold">{currentOption.nativeLabel}</span>
            <span className="hidden text-[11px] text-mute sm:inline">({currentOption.label})</span>
          </span>
        )}

        {/* Chevron icon */}
        <svg
          className={`h-3 w-3 text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("nav.language")}
          className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-2xl border border-line bg-card p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl focus:outline-none"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
            {t("nav.language")}
          </div>
          {languages.map((lang, idx) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                ref={(el) => {
                  itemsRef.current[idx] = el;
                }}
                role="option"
                aria-selected={isSelected}
                tabIndex={focusedIndex === idx ? 0 : -1}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                  isSelected
                    ? "bg-cobalt/10 font-semibold text-cobalt dark:bg-cobalt/20"
                    : "text-ink/85 hover:bg-paper hover:text-ink focus:bg-paper focus:text-ink"
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{lang.nativeLabel}</span>
                  <span className="text-[11px] text-mute">{lang.label}</span>
                </div>
                {isSelected && (
                  <svg
                    className="h-4 w-4 shrink-0 text-cobalt"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

