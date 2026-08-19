import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { FeedbackProvider, FeedbackWidget } from "feedback-agent/react";
import { App } from "./App";
import { ControlPanel, stageFor, type StageId } from "./ControlPanel";
import "./styles.css";

function Root() {
  const [stageId, setStageId] = useState<StageId>("live");
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <FeedbackProvider endpoint="/api/feedback" appVersion="acme-0.1.0">
      <App onAvatarClick={() => setPanelOpen((open) => !open)} />
      {panelOpen ? <ControlPanel value={stageId} onChange={setStageId} /> : null}
      <FeedbackWidget debug={false} stage={stageFor(stageId)} />
    </FeedbackProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
