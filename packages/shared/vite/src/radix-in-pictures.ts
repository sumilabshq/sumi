import path from "node:path";
import { PROJECT_CONFIG_FILE } from "@widgetarium/core/project/index.js";
import { PICTURE_SHIMS } from "@widgetarium/core/radix-in-pictures.js";

export interface ResolvedModule {
	readonly id: string;
}

export interface ResolveContext {
	resolve(source: string, importer: string, options: { readonly skipSelf: boolean }): Promise<ResolvedModule | null>;
}

export interface RadixInPicturesPlugin {
	readonly name: string;
	resolveId(this: ResolveContext, id: string, importer?: string): Promise<ResolvedModule | null>;
}

interface ShimAsk {
	readonly id: string;
	readonly importer: string | undefined;
	readonly fromProject: string;
}

export function radixInPictures(root: string): RadixInPicturesPlugin {
	const fromProject = path.join(root, PROJECT_CONFIG_FILE);
	return {
		name: "widgetarium-radix-in-pictures",
		resolveId(id, importer) {
			return shimInPlaceOf(this, { id, importer, fromProject });
		},
	};
}

async function shimInPlaceOf(context: ResolveContext, asked: ShimAsk): Promise<ResolvedModule | null> {
	if (!Object.hasOwn(PICTURE_SHIMS, asked.id)) {
		return null;
	}

	const shim = PICTURE_SHIMS[asked.id] ?? "";

	const resolved = await context.resolve(`@widgetarium/core/${shim.replace(/\.ts$/, ".js")}`, asked.fromProject, {
		skipSelf: true,
	});
	const isShimReachingOriginal = resolved?.id === asked.importer;
	return isShimReachingOriginal ? null : resolved;
}
