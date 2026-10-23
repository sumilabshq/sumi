import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Config = Readonly<Record<string, unknown>>;

const PROJECT_CONFIG = "vite.config.ts";
const FRONTEND_DIST = path.join(import.meta.dirname, "dist");
const NOT_A_CONFIG = "{config} must export a config object, not a function";
const TABLE_CHUNKS = [
	{
		name: "icon-table",
		test: /\/kit\/icons\/icon-table\.ts$/,
	},
	{
		name: "emoji-table",
		test: /\/kit\/emojis\/emoji-table\.ts$/,
	},
	{
		name: "shape-table",
		test: /\/kit\/shapes\/shape-table\.ts$/,
	},
];

export default withTauriBuild(await projectConfig());

async function projectConfig(): Promise<Config> {
	const at = path.join(process.cwd(), PROJECT_CONFIG);
	if (!existsSync(at)) {
		return {};
	}

	const { default: config }: { default: unknown } = await import(pathToFileURL(at).href);
	if (!isConfig(config)) {
		throw new Error(NOT_A_CONFIG.replace("{config}", at));
	}

	return config;
}

function withTauriBuild(config: Config): Config {
	return {
		...config,
		build: {
			...fieldOf(config, "build"),
			outDir: FRONTEND_DIST,
			emptyOutDir: true,
			manifest: true,
			rolldownOptions: {
				output: {
					codeSplitting: {
						groups: TABLE_CHUNKS,
					},
				},
			},
		},
	};
}

function fieldOf(config: Config, name: string): Config {
	const held = config[name];
	return isConfig(held) ? held : {};
}

function isConfig(held: unknown): held is Config {
	return typeof held === "object" && held !== null && !Array.isArray(held);
}
