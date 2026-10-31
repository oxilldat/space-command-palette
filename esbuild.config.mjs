import { builtinModules } from "node:module";
import { createRequire } from "node:module";

let esbuild;
try {
  ({ default: esbuild } = await import("esbuild"));
} catch {
  // The shared workspace already has dependencies; a fresh clone uses npm install normally.
  esbuild = createRequire(new URL("../oxill-forms/package.json", import.meta.url))("esbuild");
}

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", ...builtinModules],
  format: "cjs",
  target: "es2022",
  charset: "utf8",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  minify: production,
  outfile: "main.js"
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Oxill Pie Menu: watching source files.");
}

