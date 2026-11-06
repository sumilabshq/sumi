import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "../..");
const TAURI_PACKAGES = "@tauri-apps/";
const REFUSED =
	"{importer} imports {specifier}, but only apps/tauri reaches Tauri: ask the host through a request of @sumi/contract";

const TAURI_HOST_FOLDER = path.join(REPO, "apps", "tauri") + path.sep;

export function tauriImportRefusal(specifier: string, importer: string): string | null {
	if (!specifier.startsWith(TAURI_PACKAGES) || importer.startsWith(TAURI_HOST_FOLDER)) {
		return null;
	}

	return REFUSED.replace("{importer}", path.relative(REPO, importer)).replace("{specifier}", specifier);
}

export const tauriOnlyInHost = {
	name: "tauri-only-in-host",
	enforce: "pre" as const,
	resolveId(this: { error: (message: string) => never }, specifier: string, importer: string | undefined): null {
		if (importer === undefined) {
			return null;
		}

		const refusal = tauriImportRefusal(specifier, importer);

		if (refusal !== null) {
			this.error(refusal);
		}

		return null;
	},
};
