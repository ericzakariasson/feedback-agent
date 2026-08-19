import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { Click, KeyTicks } from "../components/Sounds";
import { ACME_ROW, T, AcmeApp, type AcmeEdit } from "../components/AcmeApp";
import { blinkOn, easeInOut, pathXY, pressScale, tval, typedCount, windowT } from "../lib/motion";
import { demo, FPS, acme } from "../script";
import { ARRIVE_CURSOR_END } from "./Arrive";

// 0:04–0:11 — Hover the title → click → inline edit → type the new name
// at full speed → click empty space → the old title snaps back. Hover again,
// drift off. No second try, no crash toast.

const CLICK_TITLE = 36;
const TYPE_START = 52;
const CLICK_AWAY = 108;
const EDIT_CLOSES = CLICK_AWAY + 2;
const SNAP = 128;
const RETURN_HOVER = 162;
const DRIFT_OFF = 176;

export const CONFUSION_CURSOR_END = { x: 1280, y: 660 } as const;

export const Confusion: React.FC = () => {
  const frame = useCurrentFrame();

  const cursor = pathXY(frame, [
    { f: 0, x: ARRIVE_CURSOR_END.x, y: ARRIVE_CURSOR_END.y },
    { f: 22, x: 690, y: 434 },
    { f: 34, x: T.titleTarget.x, y: T.titleTarget.y },
    { f: 88, x: T.titleTarget.x, y: T.titleTarget.y },
    { f: 106, x: T.emptySpace.x, y: T.emptySpace.y },
    { f: 140, x: T.emptySpace.x, y: T.emptySpace.y },
    { f: RETURN_HOVER, x: T.titleTarget.x + 6, y: T.titleTarget.y + 2 },
    { f: DRIFT_OFF, x: T.titleTarget.x + 6, y: T.titleTarget.y + 2 },
    { f: 206, x: CONFUSION_CURSOR_END.x, y: CONFUSION_CURSOR_END.y },
  ]);

  // Typed rename, full speed. Selection is replaced by the first keystroke.
  const typedChars = typedCount(frame, TYPE_START, demo.invoiceTitleNext.length, demo.typeCps, FPS);
  const typingDone = TYPE_START + Math.ceil((demo.invoiceTitleNext.length / demo.typeCps) * FPS);

  let edit: AcmeEdit = null;
  if (frame >= CLICK_TITLE + 2 && frame < EDIT_CLOSES) {
    if (typedChars === 0) {
      edit = { text: demo.invoiceTitle, selectAll: true, caretOn: false };
    } else {
      const solid = frame <= typingDone + 4;
      edit = {
        text: demo.invoiceTitleNext.slice(0, typedChars),
        selectAll: false,
        caretOn: solid ? true : blinkOn(frame - typingDone),
      };
    }
  }

  // After blur the new name sticks for a moment… then snaps back.
  const acmeTitle =
    frame >= EDIT_CLOSES && frame < SNAP ? demo.invoiceTitleNext : demo.invoiceTitle;

  // Hover states.
  const approachHover = windowT(frame, 16, CLICK_TITLE + 2, 8);
  const returnHover = windowT(frame, RETURN_HOVER - 8, DRIFT_OFF + 12, 9);
  const hoverRowT = Math.max(approachHover, edit ? 0 : returnHover);
  const titleAffordanceT = Math.max(
    windowT(frame, 26, CLICK_TITLE + 2, 7),
    windowT(frame, RETURN_HOVER - 2, DRIFT_OFF + 8, 8),
  );

  const overText =
    (frame >= 27 && frame < CLICK_TITLE + 2) ||
    (frame >= RETURN_HOVER && frame < DRIFT_OFF + 6);

  const scale = pressScale(frame, CLICK_TITLE) * pressScale(frame, CLICK_AWAY);

  // Push in on the row while they rename it; pull back out before the
  // click-away so the snap plays full-frame.
  const zoomT = tval(frame, 30, 44, easeInOut) - tval(frame, 88, 104, easeInOut);
  const zs = 1 + 0.75 * zoomT;
  const ztx = (960 - 560 * zs) * zoomT;
  const zty = (540 - 450 * zs) * zoomT;

  return (
    <AbsoluteFill style={{ background: acme.paper }}>
      <div
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${ztx}px, ${zty}px) scale(${zs})`,
        }}
      >
        <AcmeApp
          acmeTitle={acmeTitle}
          edit={edit}
          hoverRowIndex={ACME_ROW}
          hoverRowT={hoverRowT}
          titleAffordanceT={titleAffordanceT}
        />
        <Cursor x={cursor.x} y={cursor.y} scale={scale} variant={overText ? "ibeam" : "arrow"} />
      </div>

      <Click at={CLICK_TITLE} />
      <Click at={CLICK_AWAY} />
      <KeyTicks
        start={TYPE_START}
        textLength={demo.invoiceTitleNext.length}
        cps={demo.typeCps}
        fps={FPS}
      />
    </AbsoluteFill>
  );
};
