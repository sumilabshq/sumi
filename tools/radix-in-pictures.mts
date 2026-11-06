import path from "node:path";
import type { OnResolveArgs, OnResolveResult, PluginBuild, Plugin } from "esbuild";
import { PICTURE_SHIMS } from "@widgetarium/core/radix-in-pictures.js";

const CORE_SOURCE = path.resolve(import.meta.dirname, "../packages/shared/core/src");
const PASSING_THROUGH_MARK = "radix-in-pictures";
const SPECIFIERS = new RegExp(`^(${Object.keys(PICTURE_SHIMS).join("|")})$`);
const NO_SHIM = "radix in pictures has no shim for {path}";

export function createRadixInPicturesPlugin(): Plugin {
	return {
		name: "widgetarium-radix-in-pictures",
		setup(build) {
			build.onResolve({ filter: SPECIFIERS }, (found) => shimmed(build, found));
		},
	};
}

function shimmed(build: PluginBuild, found: OnResolveArgs): OnResolveResult | Promise<OnResolveResult> | null {
	if (found.pluginData === PASSING_THROUGH_MARK) {
		return null;
	}

	const shim = path.join(CORE_SOURCE, shimFileOf(found.path));

	if (found.importer === shim) {
		return passesThrough(build, found);
	}

	return { path: shim };
}

function shimFileOf(specifier: string): string {
	const shimFile = PICTURE_SHIMS[specifier];

	if (shimFile === undefined) {
		throw new Error(NO_SHIM.replace("{path}", specifier));
	}

	return shimFile;
}

function passesThrough(build: PluginBuild, found: OnResolveArgs): Promise<OnResolveResult> {
	return build.resolve(found.path, {
		kind: found.kind,
		resolveDir: found.resolveDir,
		pluginData: PASSING_THROUGH_MARK,
	});
}
