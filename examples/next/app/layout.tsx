import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { FeedbackProvider, FeedbackWidget } from "feedback-agent/react";

export const metadata = {
  title: "feedback-agent Next.js example",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const signedIn = jar.get("demo_user")?.value === "1";

  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", margin: 0 }}>
        <FeedbackProvider
          endpoint="/api/feedback"
          appVersion="next-example-0.3.0"
          capture={{ enabled: signedIn }}
        >
          {children}
          <FeedbackWidget />
        </FeedbackProvider>
      </body>
    </html>
  );
}
