import { useState } from "react";
import type { FeedbackWidgetStage } from "feedback-agent/react";

export const DEMO_MESSAGE = "Renaming an invoice reverts when I click away.";

export type StageId = "live" | "closed" | "compose" | "sending" | "thanks" | "error";

const OPTIONS: Array<{ id: StageId; label: string }> = [
  { id: "live", label: "Live" },
  { id: "closed", label: "Closed" },
  { id: "compose", label: "Compose" },
  { id: "sending", label: "Sending" },
  { id: "thanks", label: "Thanks" },
  { id: "error", label: "Error" },
];

export function stageFor(id: StageId): FeedbackWidgetStage | undefined {
  switch (id) {
    case "live":
      return undefined;
    case "closed":
      return { open: false };
    case "compose":
      return { open: true, status: "idle", message: DEMO_MESSAGE };
    case "sending":
      return { open: true, status: "submitting", message: DEMO_MESSAGE };
    case "thanks":
      return { open: true, status: "success" };
    case "error":
      return {
        open: true,
        status: "error",
        message: DEMO_MESSAGE,
        error: "Could not send feedback.",
      };
  }
}

export function ControlPanel({
  value,
  onChange,
}: {
  value: StageId
  onChange: (id: StageId) => void
}) {
  const [open, setOpen] = useState(true);
  const current = OPTIONS.find((option) => option.id === value)?.label ?? "Live";

  return (
    <aside
      className={open ? "controls" : "controls collapsed"}
      data-fw-controls=""
      data-feedback-agent=""
      aria-label="Widget states"
    >
      <button
        type="button"
        className="controls-toggle"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span className="controls-kicker">Widget</span>
        <span className="controls-current">{open ? "" : current}</span>
        <span className="controls-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="controls-list" role="radiogroup" aria-label="Stage">
          {OPTIONS.map((option) => (
            <label key={option.id} className={value === option.id ? "on" : undefined}>
              <input
                type="radio"
                name="widget-stage"
                value={option.id}
                checked={value === option.id}
                onChange={() => onChange(option.id)}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
