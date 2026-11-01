import { AppManifestSchema, CONTRACT_VERSION, contractRefusal } from "@sumi/contract";
import type { AppManifest } from "@sumi/contract";

type ManifestRead =
	| {
			readonly ok: true;
			readonly manifest: AppManifest;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

const RESERVED_IDS: ReadonlySet<string> = new Set(["app", "browser"]);

export function parseManifest(raw: unknown): ManifestRead {
	const read = AppManifestSchema.safeParse(raw);

	if (!read.success) {
		return {
			ok: false,
			reason: `sumi-app.json does not match the contract: ${read.error.issues.map((issue) => `${issue.path.join(".") || "the file"}: ${issue.message}`).join("; ")}`,
		};
	}

	return {
		ok: true,
		manifest: read.data,
	};
}

export function parseGatedManifest(id: string, raw: unknown): ManifestRead {
	const read = parseManifest(raw);

	if (!read.ok) {
		return read;
	}

	const refusal = refuseManifest(id, read.manifest);

	if (refusal === null) {
		return read;
	}

	return {
		ok: false,
		reason: refusal,
	};
}

export function refuseReservedId(id: string): string | null {
	return RESERVED_IDS.has(id) ? `"${id}" is the name of a page Sumi draws itself, so no app may take it` : null;
}

function refuseManifest(id: string, manifest: AppManifest): string | null {
	if (manifest.id !== id) {
		return `the registry names "${id}" and its release names "${manifest.id}"`;
	}

	return contractRefusal(manifest.contract, CONTRACT_VERSION);
}
