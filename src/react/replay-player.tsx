import { useEffect, useRef, useState } from "react";

interface ReplayPlayerProps {
  events: unknown[]
}

export function ReplayPlayer({ events }: ReplayPlayerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{
    play: (time?: number) => void
    pause: (time?: number) => void
    destroy: () => void
    getCurrentTime: () => number
    getMetaData: () => { totalTime: number }
    iframe: HTMLIFrameElement
  } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const stage = stageRef.current;
    if (!stage || events.length < 2) {
      setDuration(0);
      setElapsed(0);
      setPlaying(false);
      return;
    }

    void (async () => {
      try {
        const { Replayer } = await import("rrweb");
        if (cancelled || !stageRef.current) return;
        stageRef.current.replaceChildren();
        const replayer = new Replayer(events as never, {
          root: stageRef.current,
          skipInactive: true,
          showWarning: false,
          mouseTail: false,
          triggerFocus: false,
          speed: 1,
        });
        replayer.pause(0);
        replayer.disableInteract();
        const total = replayer.getMetaData().totalTime || 0;
        setDuration(total);
        setElapsed(0);
        setFailed(false);
        fitReplay(stageRef.current, replayer.iframe);
        requestAnimationFrame(() => {
          if (!cancelled && stageRef.current) fitReplay(stageRef.current, replayer.iframe);
        });
        replayer.on("start", () => setPlaying(true));
        replayer.on("pause", () => setPlaying(false));
        replayer.on("finish", () => {
          setPlaying(false);
          setElapsed(total);
        });
        playerRef.current = replayer;

        const tick = () => {
          const player = playerRef.current;
          if (cancelled || !player) return;
          setElapsed(Math.min(total, Math.max(0, player.getCurrentTime())));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    const onResize = () => {
      const player = playerRef.current;
      const nextStage = stageRef.current;
      if (player && nextStage) fitReplay(nextStage, player.iframe);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      playerRef.current?.destroy();
      playerRef.current = null;
      stage?.replaceChildren();
    };
  }, [events]);

  if (events.length < 2) {
    return <p className="fw-hint">No replay yet. Click around the page, then open Inspect again.</p>;
  }

  if (failed) {
    return <p className="fw-hint">Could not start the replay player.</p>;
  }

  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;

  return (
    <div className="fw-player">
      <div ref={stageRef} className="fw-player-stage" />
      <div className="fw-player-bar">
        <button
          type="button"
          className="fw-player-play"
          aria-label={playing ? "Pause replay" : "Play replay"}
          onClick={() => {
            const player = playerRef.current;
            if (!player) return;
            if (playing) {
              player.pause();
              return;
            }
            const offset = elapsed >= duration - 40 ? 0 : elapsed;
            player.play(offset);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          className="fw-player-scrub"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          aria-label="Replay position"
          onChange={(event) => {
            const player = playerRef.current;
            if (!player || !duration) return;
            const next = (Number(event.target.value) / 1000) * duration;
            setElapsed(next);
            player.pause(next);
          }}
        />
        <span className="fw-player-time">
          {formatTime(elapsed)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

function fitReplay(stage: HTMLElement, iframe: HTMLIFrameElement): void {
  const width = Number(iframe.width) || iframe.getBoundingClientRect().width || 1280;
  const height = Number(iframe.height) || iframe.getBoundingClientRect().height || 720;
  const maxWidth = stage.clientWidth || 360;
  const maxHeight = Math.min(280, Math.max(160, Math.round(maxWidth * 0.62)));
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const wrapper = stage.querySelector(".replayer-wrapper");
  if (!(wrapper instanceof HTMLElement)) return;
  wrapper.style.transformOrigin = "top left";
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  stage.style.height = `${Math.max(120, Math.round(height * scale))}px`;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
