import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AppManifestSchema, APP_MANIFEST_FILE } from "@sumi/contract";

export const RELEASE_FILE = "sumi-release.json";

export interface ReleaseFile {
	readonly path: string;
	readonly sha256: string;
	readonly size: number;
}

export interface Release {
	readonly app: string;
	readonly version: string;
	readonly files: readonly ReleaseFile[];
}

export function releaseOf(folder: string): Release {
	const manifest = AppManifestSchema.parse(JSON.parse(readFileSync(path.join(folder, APP_MANIFEST_FILE), "utf8")));
	return {
		app: manifest.id,
		version: manifest.version,
		files: filesUnder(folder, "").map((relative) => fileOf(folder, relative)),
	};
}

export function layRelease(folder: string): Release {
	const release = releaseOf(folder);
	writeFileSync(path.join(folder, RELEASE_FILE), `${JSON.stringify(release, null, "\t")}\n`);
	return release;
}

function filesUnder(folder: string, prefix: string): readonly string[] {
	return readdirSync(path.join(folder, prefix))
		.sort()
		.flatMap((name) => {
			const relative = prefix === "" ? name : `${prefix}/${name}`;
			const stat = lstatSync(path.join(folder, relative));

			if (stat.isSymbolicLink()) {
				throw new Error(`${relative} is a link; a release holds plain files only`);
			}

			if (stat.isDirectory()) {
				return filesUnder(folder, relative);
			}

			return relative === RELEASE_FILE ? [] : [relative];
		});
}

function fileOf(folder: string, relative: string): ReleaseFile {
	const bytes = readFileSync(path.join(folder, relative));
	return {
		path: relative,
		sha256: createHash("sha256").update(bytes).digest("hex"),
		size: bytes.length,
	};
}

if (process.argv[1] === import.meta.filename) {
	const folders = process.argv.slice(2);

	if (folders.length === 0) {
		console.error("usage: node --import ./tools/loader/register.mts tools/app-release.ts <release folder>...");
		process.exit(2);
	}

	for (const folder of folders) {
		const release = layRelease(path.resolve(folder));
		console.log(`${folder}: ${release.app} ${release.version}, ${release.files.length} files`);
	}
}
