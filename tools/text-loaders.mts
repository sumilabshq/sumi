import type { Loader } from "esbuild";

export const TEXT_LOADERS: Readonly<Record<string, Loader>> = {
	".md": "text",
	".css": "text",
};
