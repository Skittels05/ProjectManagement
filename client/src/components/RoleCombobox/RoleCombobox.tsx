import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./RoleCombobox.css";

type RoleComboboxProps = {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  ariaLabel: string;
  required?: boolean;
  className?: string;
};

export function RoleCombobox({
  value,
  suggestions,
  onChange,
  onSelect,
  onBlur,
  disabled = false,
  maxLength = 32,
  placeholder,
  ariaLabel,
  required = false,
  className = "",
}: RoleComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [listStyle, setListStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !inputRef.current) return;

    function updatePosition() {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      setListStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 10000,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const uniqueSuggestions = [...new Set(suggestions.map((role) => role.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
  const canOpen = uniqueSuggestions.length > 0 && !disabled;

  function pickRole(role: string) {
    onChange(role);
    onSelect?.(role);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`role-combobox${className ? ` ${className}` : ""}`}>
      <input
        ref={inputRef}
        className="role-combobox-input"
        type="text"
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={canOpen ? listId : undefined}
        aria-haspopup="listbox"
        required={required}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onFocus={() => {
          if (canOpen) setOpen(true);
        }}
      />
      <button
        type="button"
        className="role-combobox-toggle"
        disabled={!canOpen}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={canOpen ? listId : undefined}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          if (!canOpen) return;
          setOpen((prev) => !prev);
        }}
      />
      {open && canOpen
        ? createPortal(
            <ul id={listId} className="role-combobox-list" role="listbox" style={listStyle}>
              {uniqueSuggestions.map((role) => (
                <li key={role} role="option" aria-selected={role === value.trim()}>
                  <button
                    type="button"
                    className="role-combobox-option"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pickRole(role);
                    }}
                  >
                    {role}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
