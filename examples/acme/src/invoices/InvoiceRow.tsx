import { useFeedback } from "feedback-agent/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Invoice } from "../invoices";

export function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const { track } = useFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);
  const [title, setTitle] = useState(invoice.title);
  const [draft, setDraft] = useState(invoice.title);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setTitle(invoice.title);
    setDraft(invoice.title);
  }, [invoice.title]);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  function startEdit() {
    track("invoice_rename_started", { id: invoice.id, title });
    setDraft(title);
    setEditing(true);
  }

  function handleBlur() {
    track("invoice_rename_blurred", { id: invoice.id, draft });
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      setDraft(title);
      setEditing(false);
      return;
    }
    const next = draft.trim() || title;
    setTitle(next);
    setDraft(next);
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Escape") {
      skipCommitRef.current = true;
      setDraft(title);
      setEditing(false);
    }
  }

  return (
    <div className="row">
      <div className={`avatar avatar-${invoice.tint}`} aria-hidden="true">
        {invoice.client[0]}
      </div>
      <div className="row-copy">
        {editing ? (
          <input
            ref={inputRef}
            className="title-input"
            value={draft}
            aria-label={`Rename ${invoice.number}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <button type="button" className="title" onClick={startEdit}>
            {title}
          </button>
        )}
        <div className="sub">
          {invoice.client} · {invoice.number}
        </div>
      </div>
      <span className={`chip chip-${invoice.status.toLowerCase()}`}>{invoice.status}</span>
      <div className="amount">{invoice.amount}</div>
      <div className="date">{invoice.date}</div>
    </div>
  );
}
