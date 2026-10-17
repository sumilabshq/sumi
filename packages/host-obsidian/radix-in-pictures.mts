import path from "node:path";
import type { OnResolveArgs, OnResolveResult, PluginBuild, Plugin } from "esbuild";
import { PICTURE_SHIMS } from "../core/src/radix-in-pictures.ts";

const CORE_SOURCE = path.resolve(import.meta.dirname, "../core/src");
const SHIM_REACHES_ORIGINAL = "radix-in-pictures";
const SPECIFIERS = new RegExp(`^(${Object.keys(PICTURE_SHIMS).join("|")})$`);

export function radixInPictures(): Plugin {
	return {
		name: "widgetarium-radix-in-pictures",
		setup(build) {
			build.onResolve({ filter: SPECIFIERS }, (found) => shimmed(build, found));
		},
	};
}

function shimmed(build: PluginBuild, found: OnResolveArgs): OnResolveResult | Promise<OnResolveResult> | null {
	if (found.pluginData === SHIM_REACHES_ORIGINAL) return null;
	const shim = path.join(CORE_SOURCE, PICTURE_SHIMS[found.path] ?? "");
	if (found.importer === shim) return passesThrough(build, found);
	return { path: shim };
}

function passesThrough(build: PluginBuild, found: OnResolveArgs): Promise<OnResolveResult> {
	return build.resolve(found.path, {
		kind: found.kind,
		resolveDir: found.resolveDir,
		pluginData: SHIM_REACHES_ORIGINAL,
	});
}
