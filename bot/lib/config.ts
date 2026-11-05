/**
 * The repository the cloud agent fixes. Edit the defaults to point the bot at
 * your app. Locally, FEEDBACK_REPO_URL / FEEDBACK_REPO_REF in `.env.local`
 * override them; on Cursor hosting, set them as deployment secrets.
 */
export const DEFAULT_REPO_URL = "https://github.com/ericzakariasson/feedback-agent";
export const DEFAULT_REPO_REF = "main";

export type TargetRepo = { url: string; startingRef: string };

export function targetRepo(): TargetRepo {
  return {
    url: process.env.FEEDBACK_REPO_URL?.trim() || DEFAULT_REPO_URL,
    startingRef: process.env.FEEDBACK_REPO_REF?.trim() || DEFAULT_REPO_REF,
  };
}

export const DEMO_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

/** Slack's `post-file` cap in the slack-communication extension. */
export const MAX_DEMO_BYTES = 50 * 1024 * 1024;
