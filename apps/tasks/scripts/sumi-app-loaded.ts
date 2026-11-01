import path from "node:path";
import type { AppManifest, AppManifestSchema } from "@sumi/contract";
import { createServer } from "vite";

const web = path.join(import.meta.dirname, "..");
const NOT_THE_CONTRACT = "@sumi/contract, loaded through vite, holds no AppManifestSchema or APP_MANIFEST_FILE";

export interface SumiApp {
	readonly APP_MANIFEST_FILE: string;
	readonly manifest: AppManifest;
}

function isManifestSchema(value: unknown): value is typeof AppManifestSchema {
	return typeof value === "object" && value !== null && typeof Reflect.get(value, "parse") === "function";
}

export async function loadSumiApp(): Promise<SumiApp> {
	const server = await createServer({
		configFile: path.join(web, "vite.config.ts"),
		logLevel: "warn",
		appType: "custom",
		server: {
			middlewareMode: true,
			hmr: false,
			ws: false,
		},
	});

	try {
		const contract: Record<string, unknown> = await server.ssrLoadModule("@sumi/contract");
		const loaded: Record<string, unknown> = await server.ssrLoadModule(path.join(web, "sumi-app.ts"));
		const schema = contract["AppManifestSchema"];
		const manifestFile = contract["APP_MANIFEST_FILE"];

		if (!isManifestSchema(schema) || typeof manifestFile !== "string") {
			throw new Error(NOT_THE_CONTRACT);
		}

		return {
			APP_MANIFEST_FILE: manifestFile,
			manifest: schema.parse(loaded["manifest"]),
		};
	} finally {
		await server.close();
	}
}
