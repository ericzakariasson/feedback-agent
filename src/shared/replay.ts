import { CLIENT_LIMITS } from "./limits";

/** Mirrors rrweb `EventType` numeric values. */
const EventType = {
  DomContentLoaded: 0,
  Load: 1,
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Custom: 5,
  Plugin: 6,
  Asset: 7,
} as const;

/** Mirrors rrweb `IncrementalSource` numeric values. */
const IncrementalSource = {
  Mutation: 0,
  MouseMove: 1,
  MouseInteraction: 2,
  Scroll: 3,
  ViewportResize: 4,
  Input: 5,
  TouchMove: 6,
  MediaInteraction: 7,
  StyleSheetRule: 8,
  CanvasMutation: 9,
  Font: 10,
  Log: 11,
  Drag: 12,
  StyleDeclaration: 13,
  Selection: 14,
  AdoptedStyleSheet: 15,
  CustomElement: 16,
} as const;

interface ReplayEvent {
  type: number
  timestamp?: number
  data?: {
    source?: number
    adds?: unknown[]
    removes?: unknown[]
    texts?: unknown[]
    attributes?: unknown[]
    positions?: unknown[]
  }
}

/**
 * Drop pointer-move / selection noise and orphan incrementals. Clicks stay.
 * Keep a playable chain: meta + full snapshot (+ later checkouts) through the end.
 */
export function compactReplayEvents(
  events: unknown[],
  maxEvents = CLIENT_LIMITS.maxReplayEvents,
): unknown[] {
  const cleaned: ReplayEvent[] = [];
  for (const event of events) {
    if (!isReplayEvent(event) || !isUsefulReplayEvent(event)) continue;
    cleaned.push(event);
  }

  const fullIndexes: number[] = [];
  for (let index = 0; index < cleaned.length; index += 1) {
    if (cleaned[index]?.type === EventType.FullSnapshot) fullIndexes.push(index);
  }
  if (fullIndexes.length === 0) return [];

  let chosen = preambleStart(cleaned, fullIndexes[fullIndexes.length - 1]!);
  for (const fullIndex of fullIndexes) {
    const start = preambleStart(cleaned, fullIndex);
    if (cleaned.length - start <= maxEvents) {
      chosen = start;
      break;
    }
  }

  return cleaned.slice(chosen);
}

export function isUsefulReplayEvent(event: ReplayEvent): boolean {
  if (
    event.type === EventType.Meta ||
    event.type === EventType.FullSnapshot ||
    event.type === EventType.Load ||
    event.type === EventType.DomContentLoaded
  ) {
    return true;
  }
  if (event.type !== EventType.IncrementalSnapshot) return false;

  const source = event.data?.source;
  if (source == null) return false;
  if (
    source === IncrementalSource.MouseMove ||
    source === IncrementalSource.TouchMove ||
    source === IncrementalSource.Selection ||
    source === IncrementalSource.MediaInteraction ||
    source === IncrementalSource.Font ||
    source === IncrementalSource.Log ||
    source === IncrementalSource.CanvasMutation ||
    source === IncrementalSource.CustomElement
  ) {
    return false;
  }
  if (source === IncrementalSource.Mutation) return !isEmptyMutation(event);
  return true;
}

function isEmptyMutation(event: ReplayEvent): boolean {
  const data = event.data;
  if (!data) return true;
  return (
    !data.adds?.length &&
    !data.removes?.length &&
    !data.texts?.length &&
    !data.attributes?.length
  );
}

function preambleStart(events: ReplayEvent[], fullIndex: number): number {
  let start = fullIndex;
  for (let index = fullIndex - 1; index >= 0; index -= 1) {
    const type = events[index]?.type;
    if (
      type === EventType.Meta ||
      type === EventType.Load ||
      type === EventType.DomContentLoaded
    ) {
      start = index;
      continue;
    }
    break;
  }
  return start;
}

function isReplayEvent(value: unknown): value is ReplayEvent {
  return typeof value === "object" && value !== null && "type" in value && typeof (value as ReplayEvent).type === "number";
}
