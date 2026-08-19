import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { Click, KeyTicks } from "../components/Sounds";
import { T, AcmeApp } from "../components/AcmeApp";
import { WIDGET, Widget } from "../components/Widget";
import { blinkOn, easeOut, pathXY, pressScale, tval, typedCount, windowT } from "../lib/motion";
import { demo, FPS } from "../script";
import { CONFUSION_CURSOR_END } from "./Confusion";

// 0:11–0:18.5 — Cursor to Feedback. Sheet in. Type the report at full speed.
// Send. Thanks + Reference: evt_7f3a. Cut.

const CLICK_TRIGGER = 32;
const TYPE_START = 66;
const CLICK_SEND = 134;
const THANKS = 152;

export const Report: React.FC = () => {
  const frame = useCurrentFrame();

  const cursor = pathXY(frame, [
    { f: 0, x: CONFUSION_CURSOR_END.x, y: CONFUSION_CURSOR_END.y },
    { f: 30, x: T.trigger.cx, y: T.trigger.cy },
    { f: 38, x: T.trigger.cx, y: T.trigger.cy },
    { f: 54, x: 1348, y: 906 },
    { f: 112, x: 1348, y: 906 },
    { f: 132, x: WIDGET.send.cx + 4, y: WIDGET.send.cy + 2 },
    { f: 156, x: WIDGET.send.cx + 4, y: WIDGET.send.cy + 2 },
    { f: 184, x: WIDGET.send.cx + 96, y: WIDGET.send.cy + 88 },
  ]);

  // Widget opening.
  const triggerVisibleT = 1 - tval(frame, CLICK_TRIGGER, CLICK_TRIGGER + 8);
  const scrimT = tval(frame, CLICK_TRIGGER, CLICK_TRIGGER + 14);
  const openT = tval(frame, CLICK_TRIGGER + 2, CLICK_TRIGGER + 20, easeOut);

  // Typing.
  const typedChars = typedCount(frame, TYPE_START, demo.message.length, demo.typeCps, FPS);
  const text = demo.message.slice(0, typedChars);
  const typingDone = TYPE_START + Math.ceil((demo.message.length / demo.typeCps) * FPS);
  const focusT = tval(frame, CLICK_TRIGGER + 20, CLICK_TRIGGER + 26);
  const caretOn =
    frame >= CLICK_TRIGGER + 22 && frame < CLICK_SEND
      ? frame >= TYPE_START - 2 && frame <= typingDone + 4
        ? true
        : blinkOn(frame)
      : false;

  // Send → sending → thanks.
  const sending = frame >= CLICK_SEND && frame < THANKS;
  const view = frame >= THANKS ? "thanks" : "compose";
  const thanksT = tval(frame, THANKS, THANKS + 12);
  const idPulseT = windowT(frame, 168, 206, 12);

  const sendHoverT = windowT(frame, 126, CLICK_SEND + 4, 6);
  const scale = pressScale(frame, CLICK_TRIGGER) * pressScale(frame, CLICK_SEND);

  return (
    <AbsoluteFill>
      <AcmeApp triggerHoverT={windowT(frame, 24, CLICK_TRIGGER + 4, 6)} triggerVisibleT={triggerVisibleT} scrimT={scrimT} />
      <Widget
        openT={openT}
        view={view}
        thanksT={thanksT}
        text={text}
        caretOn={caretOn}
        focusT={focusT}
        sending={sending}
        sendHoverT={sendHoverT}
        sendScale={pressScale(frame, CLICK_SEND)}
        feedbackId={demo.feedbackId}
        idPulseT={idPulseT}
      />
      <Cursor x={cursor.x} y={cursor.y} scale={scale} />

      <Click at={CLICK_TRIGGER} />
      <Click at={CLICK_SEND} />
      <KeyTicks start={TYPE_START} textLength={demo.message.length} cps={demo.typeCps} fps={FPS} />
    </AbsoluteFill>
  );
};
