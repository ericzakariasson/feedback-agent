import { useContext } from "react";
import { FeedbackContext, type FeedbackContextValue } from "./context";

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext);
  if (!value) {
    throw new Error("useFeedback() must be used within <FeedbackProvider>.");
  }
  return value;
}
