import { redactText } from "./redact";

const EventType: Record<number, string> = {
  0: "DomContentLoaded",
  1: "Load",
  2: "FullSnapshot",
  3: "Incremental",
  4: "Meta",
  5: "Custom",
  6: "Plugin",
  7: "Asset",
};

const IncrementalSource: Record<number, string> = {
  0: "Mutation",
  1: "MouseMove",
  2: "MouseInteraction",
  3: "Scroll",
  4: "ViewportResize",
  5: "Input",
  6: "TouchMove",
  7: "MediaInteraction",
  8: "StyleSheetRule",
  9: "CanvasMutation",
  10: "Font",
  11: "Log",
  12: "Drag",
  13: "StyleDeclaration",
  14: "Selection",
  15: "AdoptedStyleSheet",
  16: "CustomElement",
};

const MouseInteraction: Record<number, string> = {
  0: "MouseUp",
  1: "MouseDown",
  2: "Click",
  3: "ContextMenu",
  4: "DblClick",
  5: "Focus",
  6: "Blur",
  7: "TouchStart",
  8: "TouchMove",
  9: "TouchEnd",
  10: "TouchCancel",
};

const SKIP_TREE_TAGS = new Set(["script", "style", "link", "noscript"]);
const MAX_TREE_LINES = 160;
const MAX_MUTATION_LINES = 48;
const MAX_TEXT = 96;

interface SerializedNode {
  type?: number
  id?: number
  tagName?: string
  name?: string
  attributes?: Record<string, string>
  textContent?: string
  childNodes?: SerializedNode[]
}

interface ReplayEvent {
  type?: number
  timestamp?: number
  data?: Record<string, unknown>
}

export function formatReplayTimeline(events: unknown[]): string {
  const list = events.filter((event): event is ReplayEvent => typeof event === "object" && event !== null);
  if (list.length === 0) return "none";

  const origin = list.find((event) => typeof event.timestamp === "number")?.timestamp ?? 0;
  const last = [...list].reverse().find((event) => typeof event.timestamp === "number")?.timestamp ?? origin;
  const lines = [`${list.length} events · ${formatOffset(Math.max(0, last - origin))}`];

  for (const event of list) {
    lines.push(...formatEvent(event, origin));
  }
  return lines.join("\n");
}

function formatEvent(event: ReplayEvent, origin: number): string[] {
  const time = formatOffset(Math.max(0, (event.timestamp ?? origin) - origin));
  const type = event.type;
  const data = event.data ?? {};

  if (type === 4) {
    const href = typeof data.href === "string" ? data.href : "";
    const width = data.width ?? "?";
    const height = data.height ?? "?";
    return [`${time}  Meta  ${width}×${height}${href ? `  ${href}` : ""}`];
  }

  if (type === 2) {
    const root = (data.node ?? data) as SerializedNode;
    const count = countNodes(root);
    const tree: string[] = [];
    walkTree(root, 0, tree);
    const body = tree.slice(0, MAX_TREE_LINES);
    if (tree.length > MAX_TREE_LINES) body.push(`          …${tree.length - MAX_TREE_LINES} more nodes`);
    return [`${time}  FullSnapshot  ${count} nodes`, ...body];
  }

  if (type === 3) {
    const source = Number(data.source);
    const name = IncrementalSource[source] ?? `source ${source}`;
    if (source === 0) return formatMutation(time, data);
    if (source === 2) {
      const kind = MouseInteraction[Number(data.type)] ?? `type ${data.type}`;
      return [`${time}  ${kind}  #${data.id ?? "?"} @ (${data.x ?? "?"},${data.y ?? "?"})`];
    }
    if (source === 3) {
      return [`${time}  Scroll  #${data.id ?? "?"}  x=${data.x ?? 0} y=${data.y ?? 0}`];
    }
    if (source === 4) {
      return [`${time}  ViewportResize  ${data.width ?? "?"}×${data.height ?? "?"}`];
    }
    if (source === 5) {
      return [`${time}  Input  #${data.id ?? "?"}  ${quote(String(data.text ?? ""))}`];
    }
    if (source === 12) {
      return [`${time}  Drag  #${data.id ?? "?"} @ (${data.x ?? "?"},${data.y ?? "?"})`];
    }
    if (source === 8 || source === 13 || source === 15) {
      return [`${time}  ${name}`];
    }
    return [`${time}  ${name}  #${data.id ?? "?"}`];
  }

  const label = EventType[type ?? -1] ?? `type ${type}`;
  if (type === 5 || type === 6) {
    const tag = typeof data.tag === "string" ? data.tag : typeof data.plugin === "string" ? data.plugin : "";
    return [`${time}  ${label}${tag ? `  ${tag}` : ""}`];
  }
  return [`${time}  ${label}`];
}

function formatMutation(time: string, data: Record<string, unknown>): string[] {
  const adds = asArray(data.adds);
  const removes = asArray(data.removes);
  const texts = asArray(data.texts);
  const attributes = asArray(data.attributes);
  const header = `${time}  Mutation  +${adds.length} −${removes.length} text=${texts.length} attr=${attributes.length}`;
  const details: string[] = [];

  for (const add of adds) {
    if (details.length >= MAX_MUTATION_LINES) break;
    const rec = asRecord(add);
    const node = asRecord(rec.node) as SerializedNode;
    details.push(`          + #${node.id ?? "?"} ${describeNode(node)}  parent=#${rec.parentId ?? "?"}`);
  }
  for (const remove of removes) {
    if (details.length >= MAX_MUTATION_LINES) break;
    const rec = asRecord(remove);
    details.push(`          − #${rec.id ?? "?"}`);
  }
  for (const text of texts) {
    if (details.length >= MAX_MUTATION_LINES) break;
    const rec = asRecord(text);
    details.push(`          text #${rec.id ?? "?"}  ${quote(String(rec.value ?? rec.text ?? ""))}`);
  }
  for (const attr of attributes) {
    if (details.length >= MAX_MUTATION_LINES) break;
    const rec = asRecord(attr);
    const attrs = asRecord(rec.attributes);
    const parts = Object.entries(attrs).slice(0, 6).map(([key, value]) => `${key}=${quote(String(value ?? ""))}`);
    details.push(`          attr #${rec.id ?? "?"}  ${parts.join(" ") || "(cleared)"}`);
  }
  if (adds.length + removes.length + texts.length + attributes.length > details.length) {
    details.push("          …");
  }
  return [header, ...details];
}

function walkTree(node: SerializedNode | undefined, depth: number, out: string[]): void {
  if (!node || out.length >= MAX_TREE_LINES) return;
  if (node.type === 3) {
    const text = compactText(node.textContent ?? "");
    if (text) out.push(`${indent(depth)}${quote(text)}`);
    return;
  }
  if (node.type === 1) {
    out.push(`${indent(depth)}!${node.name || "doctype"}`);
    return;
  }
  const label = describeNode(node);
  if (!label && node.type !== 0 && node.type !== 2) return;
  if (node.type === 0) {
    for (const child of node.childNodes ?? []) walkTree(child, depth, out);
    return;
  }
  const tag = (node.tagName || "").toLowerCase();
  out.push(`${indent(depth)}${label || tag || "node"}`);
  if (SKIP_TREE_TAGS.has(tag)) return;
  for (const child of node.childNodes ?? []) walkTree(child, depth + 1, out);
}

function describeNode(node: SerializedNode): string {
  if (node.type === 3) return quote(node.textContent ?? "");
  const tag = (node.tagName || node.name || "node").toLowerCase();
  const attrs = node.attributes ?? {};
  const id = attrs.id ? `#${attrs.id}` : "";
  const cls = attrs.class
    ? `.${attrs.class.trim().split(/\s+/).slice(0, 3).join(".")}`
    : "";
  const interesting = ["data-theme", "type", "name", "href", "role", "aria-label", "placeholder"]
    .map((key) => (attrs[key] != null && attrs[key] !== "" ? `[${key}=${quote(attrs[key], 40)}]` : ""))
    .join("");
  const rrwebId = node.id != null ? `(#${node.id})` : "";
  return `${tag}${id}${cls}${interesting} ${rrwebId}`.trim();
}

function countNodes(node: SerializedNode | undefined): number {
  if (!node) return 0;
  return 1 + (node.childNodes ?? []).reduce((sum, child) => sum + countNodes(child), 0);
}

function formatOffset(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function quote(value: string, max = MAX_TEXT): string {
  return JSON.stringify(redactText(compactText(value), max));
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function indent(depth: number): string {
  return `          ${"  ".repeat(Math.max(0, depth))}`;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
