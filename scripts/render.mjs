// Full 1080x1920 render. Bundles once, then encodes h264.
import fs from "node:fs";
const tmp = "/tmp/remotion-tmp";
fs.mkdirSync(tmp, { recursive: true });
process.env.REMOTION_TMP = process.env.TEMP = process.env.TMP = tmp;
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const browserExecutable = "/usr/bin/google-chrome";
const chromiumOptions = { gl: "angle", args: ["--no-sandbox", "--disable-dev-shm-usage"] };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "NikeShort", browserExecutable, chromiumOptions });
const out = "out/nike/silent.mp4";
await renderMedia({
  composition, serveUrl, codec: "h264", outputLocation: out, crf: 16,
  concurrency: 2, browserExecutable, chromiumOptions,
  timeoutInMilliseconds: 180000,
  onProgress: ({ renderedFrames, progress }) => {
    if (renderedFrames % 60 === 0) process.stdout.write(`frame ${renderedFrames} ${(progress * 100).toFixed(1)}%\n`);
  },
  onBrowserLog: (l) => { if (l.type === "error") process.stdout.write(`[error] ${l.text.slice(0, 300)}\n`); },
});
console.log("rendered", out);
