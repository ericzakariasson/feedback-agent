import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CrashButton } from "./crash-button";

async function signIn() {
  "use server";
  const jar = await cookies();
  jar.set("demo_user", "1", { httpOnly: false, path: "/" });
  revalidatePath("/");
}

async function signOut() {
  "use server";
  const jar = await cookies();
  jar.delete("demo_user");
  revalidatePath("/");
}

export default async function Page() {
  const jar = await cookies();
  const signedIn = jar.get("demo_user")?.value === "1";

  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 20px" }}>
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        Next.js App Router example. Capture starts only after sign-in. Dispatch stays dry-run unless
        you set FEEDBACK_DRY_RUN=false.
      </p>
      <h1>Settings</h1>
      <p>
        {signedIn
          ? "Signed in. Session capture is on. Send feedback from the widget."
          : "Signed out. Replay is off until you sign in (consent / auth gate)."}
      </p>
      <form action={signedIn ? signOut : signIn}>
        <button type="submit">{signedIn ? "Sign out" : "Sign in"}</button>
      </form>
      <section style={{ marginTop: 32 }}>
        <h2>Plan</h2>
        <p>Click around, then report that saving crashes.</p>
        <CrashButton />
      </section>
    </main>
  );
}
