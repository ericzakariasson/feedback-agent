import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

function prependUseClient(file: string): void {
  const source = readFileSync(file, "utf8");
  if (source.startsWith('"use client"') || source.startsWith("'use client'")) return;
  writeFileSync(file, `"use client";\n${source}`);
}

export default defineConfig([
  {
    entry: { index: "src/react/index.ts" },
    outDir: "dist/react",
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    external: ["react", "react-dom", "react/jsx-runtime", "@rrweb/record", "html-to-image", "rrweb"],
    clean: true,
    async onSuccess() {
      prependUseClient("dist/react/index.js");
      prependUseClient("dist/react/index.cjs");
    },
  },
  {
    entry: { index: "src/server/index.ts" },
    outDir: "dist/server",
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    treeshake: true,
    clean: true,
    platform: "neutral",
  },
]);
