export type InvoiceStatus = "Paid" | "Sent" | "Draft" | "Overdue";

export type Invoice = {
  id: string
  client: string
  title: string
  number: string
  status: InvoiceStatus
  amount: string
  date: string
  tint: "blue" | "violet" | "green" | "gold" | "red" | "slate"
};

export const INVOICES: Invoice[] = [
  {
    id: "inv-0139",
    client: "Halcyon Labs",
    title: "Onboarding flow",
    number: "INV-0139",
    status: "Paid",
    amount: "$3,400",
    date: "Jul 28",
    tint: "blue",
  },
  {
    id: "inv-0142",
    client: "Northwind",
    title: "Website refresh",
    number: "INV-0142",
    status: "Sent",
    amount: "$6,200",
    date: "Aug 22",
    tint: "violet",
  },
  {
    id: "inv-0143",
    client: "Meridian & Co",
    title: "Q3 retainer",
    number: "INV-0143",
    status: "Sent",
    amount: "$8,000",
    date: "Aug 30",
    tint: "green",
  },
  {
    id: "inv-0144",
    client: "Bluebird Café",
    title: "Menu redesign",
    number: "INV-0144",
    status: "Draft",
    amount: "$1,150",
    date: "—",
    tint: "gold",
  },
  {
    id: "inv-0138",
    client: "Foxglove Press",
    title: "Catalogue layout",
    number: "INV-0138",
    status: "Paid",
    amount: "$2,750",
    date: "Jul 19",
    tint: "red",
  },
  {
    id: "inv-0131",
    client: "Standard Freight",
    title: "Logistics dashboard",
    number: "INV-0131",
    status: "Overdue",
    amount: "$9,600",
    date: "Jul 5",
    tint: "slate",
  },
];
