import React from "react";
import { Composition, Folder } from "remotion";
import { Agent } from "./beats/Agent";
import { Arrive } from "./beats/Arrive";
import { Confusion } from "./beats/Confusion";
import { EndCard } from "./beats/EndCard";
import { Owner } from "./beats/Owner";
import { Packet } from "./beats/Packet";
import { Report } from "./beats/Report";
import { BEATS, FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./script";
import { Video } from "./Video";

const size = { fps: FPS, width: WIDTH, height: HEIGHT };

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="Demo" component={Video} durationInFrames={TOTAL_FRAMES} {...size} />
      <Folder name="Beats">
        <Composition id="Arrive" component={Arrive} durationInFrames={BEATS.arrive.duration} {...size} />
        <Composition id="Confusion" component={Confusion} durationInFrames={BEATS.confusion.duration} {...size} />
        <Composition id="Report" component={Report} durationInFrames={BEATS.report.duration} {...size} />
        <Composition id="Packet" component={Packet} durationInFrames={BEATS.packet.duration} {...size} />
        <Composition id="Agent" component={Agent} durationInFrames={BEATS.agent.duration} {...size} />
        <Composition id="Owner" component={Owner} durationInFrames={BEATS.owner.duration} {...size} />
        <Composition id="EndCard" component={EndCard} durationInFrames={BEATS.endcard.duration} {...size} />
      </Folder>
    </>
  );
};
