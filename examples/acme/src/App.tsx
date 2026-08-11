import { useEffect } from "react";
import { INVOICES } from "./invoices";
import { InvoiceRow } from "./invoices/InvoiceRow";

export function App() {
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
        <div className="user" aria-label="Signed in as Ellis">
          E
        </div>
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
