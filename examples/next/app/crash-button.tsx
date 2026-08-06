"use client";

export function CrashButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.setTimeout(() => {
          throw new Error("Cannot read properties of undefined (reading 'plan')");
        }, 0);
      }}
    >
      Save plan
    </button>
  );
}
