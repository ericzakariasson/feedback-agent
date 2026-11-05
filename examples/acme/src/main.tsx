import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FeedbackProvider, FeedbackWidget } from "feedback-agent/react";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FeedbackProvider endpoint="/api/feedback" appVersion="acme-0.1.0">
      <App />
      <FeedbackWidget debug={false} />
    </FeedbackProvider>
  </StrictMode>,
);
