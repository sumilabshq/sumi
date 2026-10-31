import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as esbuild from "esbuild";
import { CONTRACT_RANGE } from "@sumi/contract";
import { layRelease } from "./app-release.ts";

interface HelloRelease {
	readonly version: string;
	readonly sendsReady: boolean;
}

const HELLO_SOURCE = path.resolve("tools/fixtures/hello-app/src");

export const HELLO_RELEASES: readonly HelloRelease[] = [
	{
		version: "1.0.0",
		sendsReady: true,
	},
	{
		version: "1.0.1",
		sendsReady: true,
	},
	{
		version: "1.0.2",
		sendsReady: false,
	},
];

export function helloReleaseFolderOf(root: string, version: string): string {
	return path.join(root, version);
}

export async function buildHelloReleases(): Promise<string> {
	const root = mkdtempSync(path.join(tmpdir(), "hello-app-"));

	for (const release of HELLO_RELEASES) {
		await buildRelease(root, release);
	}

	return root;
}

async function buildRelease(root: string, { version, sendsReady }: HelloRelease): Promise<void> {
	const folder = helloReleaseFolderOf(root, version);
	mkdirSync(folder, {
		recursive: true,
	});
	await esbuild.build({
		entryPoints: [path.join(HELLO_SOURCE, "hello.ts")],
		outfile: path.join(folder, "hello.js"),
		bundle: true,
		conditions: ["source"],
		format: "iife",
		platform: "browser",
		target: "es2020",
		legalComments: "none",
		minify: true,
		define: {
			HELLO_VERSION: JSON.stringify(version),
			HELLO_SENDS_READY: JSON.stringify(sendsReady),
		},
		logLevel: "warning",
	});
	copyFileSync(path.join(HELLO_SOURCE, "index.html"), path.join(folder, "index.html"));
	writeFileSync(
		path.join(folder, "sumi-app.json"),
		`${JSON.stringify(
			{
				id: "hello",
				name: "Hello",
				version,
				contract: CONTRACT_RANGE,
				ui: "index.html",
			},
			null,
			"\t",
		)}\n`,
	);
	layRelease(folder);
}

if (process.argv[1] === import.meta.filename) {
	console.log(`hello releases built in ${await buildHelloReleases()}`);
}
