import { useEffect } from "react";
import { INVOICES } from "./invoices";
import { InvoiceRow } from "./invoices/InvoiceRow";

export function App({
  onAvatarClick,
}: {
  onAvatarClick: () => void
}) {
  useEffect(() => {
    if (window.location.pathname !== "/invoices") {
      window.history.replaceState(null, "", "/invoices");
    }
  }, []);

  const awaiting = INVOICES.filter((row) => row.status === "Sent" || row.status === "Overdue").length;

  return (
    <div className="app">
      <header className="brand">
        <div className="mark" aria-hidden="true">
          A
        </div>
        <div className="wordmark">Acme</div>
        <div className="spacer" />
        <button
          type="button"
          className="user"
          aria-label="Open widget stages"
          data-fw-controls=""
          data-feedback-agent=""
          onClick={onAvatarClick}
        >
          E
        </button>
      </header>

      <main className="page">
        <h1>Invoices</h1>
        <p className="lede">
          {INVOICES.length} invoices · {awaiting} awaiting payment
        </p>
        <section className="list" aria-label="Invoice list">
          {INVOICES.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </section>
      </main>
    </div>
  );
}
