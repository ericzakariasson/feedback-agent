import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Agent } from "./beats/Agent";
import { Arrive } from "./beats/Arrive";
import { Confusion } from "./beats/Confusion";
import { EndCard } from "./beats/EndCard";
import { Owner } from "./beats/Owner";
import { Packet } from "./beats/Packet";
import { Report } from "./beats/Report";
import { BEATS } from "./script";

// The full demo: every beat is a composition; this sequences them.
export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#FCFCFC" }}>
      <Sequence from={BEATS.arrive.from} durationInFrames={BEATS.arrive.duration} name="Arrive">
        <Arrive />
      </Sequence>
      <Sequence from={BEATS.confusion.from} durationInFrames={BEATS.confusion.duration} name="Confusion">
        <Confusion />
      </Sequence>
      <Sequence from={BEATS.report.from} durationInFrames={BEATS.report.duration} name="Report">
        <Report />
      </Sequence>
      <Sequence from={BEATS.packet.from} durationInFrames={BEATS.packet.duration} name="Packet">
        <Packet />
      </Sequence>
      <Sequence from={BEATS.agent.from} durationInFrames={BEATS.agent.duration} name="Agent">
        <Agent />
      </Sequence>
      <Sequence from={BEATS.owner.from} durationInFrames={BEATS.owner.duration} name="Owner">
        <Owner />
      </Sequence>
      <Sequence from={BEATS.endcard.from} durationInFrames={BEATS.endcard.duration} name="EndCard">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
