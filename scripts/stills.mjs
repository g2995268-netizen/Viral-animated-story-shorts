// node scripts/stills.mjs <outPrefix> <frame,frame,...> [scale]
import fs from "node:fs";
const tmp = process.env.REMOTION_TMP || "/tmp/remotion-tmp";
fs.mkdirSync(tmp, { recursive: true });
process.env.REMOTION_TMP = process.env.TEMP = process.env.TMP = tmp;
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "/usr/bin/google-chrome";
const chromiumOptions = { gl: "angle", args: ["--no-sandbox", "--disable-dev-shm-usage"] };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "NikeShort", browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 400)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 86, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
