import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "../..");
const TAURI_PACKAGES = "@tauri-apps/";
const REFUSED =
	"{importer} imports {specifier}, but only apps/tauri reaches Tauri: ask the host through a request of @sumi/contract";

export const TAURI_HOST_FOLDER = "apps/tauri";

// TODO: move each into apps/tauri, then drop it here
export const TAURI_REACHERS_TO_MOVE = [
	"packages/domain/app-host",
	"packages/domain/browser",
	"packages/domain/file-system",
	"packages/domain/terminal",
	"packages/domain/workspaces",
	"packages/state/layout",
	"packages/state/places",
	"packages/shared/data-framework",
];

export function tauriImportRefusal(specifier: string, importer: string): string | null {
	if (!specifier.startsWith(TAURI_PACKAGES)) {
		return null;
	}

	if (REACHING_FOLDERS.some((folder) => importer.startsWith(folder))) {
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

const REACHING_FOLDERS = [TAURI_HOST_FOLDER, ...TAURI_REACHERS_TO_MOVE].map(
	(folder) => path.join(REPO, folder) + path.sep,
);
