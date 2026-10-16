import { dirname } from "node:path";
import type { OnResolveArgs, Plugin, PluginBuild } from "esbuild";
import { platformBuildOf, type PlatformBuild } from "../../packages/vite/src/platform-adapters.ts";

export interface EsbuildPlatformBuild {
	readonly define: Readonly<Record<string, string>>;
	readonly plugin: Plugin;
}

export const PLATFORM_STUB = "platform-stub";

const MAY_BE_STOOD_IN = /\.adapter(\.[jt]sx?)?$|(^|\/)server(\/|$)/;
const RESOLVING_ITSELF = "platform-stand-in-resolving";

export function esbuildPlatformBuildOf(built: string): EsbuildPlatformBuild {
	const platform = platformBuildOf(built);
	return { define: platform.define, plugin: standInsPlugin(platform) };
}

function standInsPlugin(platform: PlatformBuild): Plugin {
	return {
		name: "platform-adapters",
		setup(build) {
			build.onResolve({ filter: MAY_BE_STOOD_IN }, (asked) => standInResolved(build, platform, asked));
			build.onLoad({ filter: /.*/, namespace: PLATFORM_STUB }, async ({ path }) => ({
				contents: await platform.standInOf(path),
				loader: "js",
				resolveDir: dirname(path),
			}));
		},
	};
}

async function standInResolved(
	build: PluginBuild,
	platform: PlatformBuild,
	{ path, resolveDir, kind, importer, pluginData }: OnResolveArgs,
): Promise<{ path: string; namespace: string } | undefined> {
	if (pluginData === RESOLVING_ITSELF) return undefined;
	const resolved = await build.resolve(path, { resolveDir, kind, importer, pluginData: RESOLVING_ITSELF });
	if (resolved.errors.length > 0 || !platform.isStoodIn(resolved.path)) return undefined;
	return { path: resolved.path, namespace: PLATFORM_STUB };
}
