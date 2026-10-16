import { registerHooks } from "node:module";
import { load, resolve } from "./hooks.mts";

registerHooks({ resolve, load });
Reflect.set(globalThis, "__WG_PLATFORM__", process.env["WG_PLATFORM"] ?? "obsidian");
await import("../packs-registered.ts");
