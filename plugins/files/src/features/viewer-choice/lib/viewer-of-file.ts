import { z } from "zod";
import { ANY_EXTENSION } from "../../../slots.js";
import type { FileViewer } from "../../../slots.js";

export interface ChosenViewer {
	readonly viewer: FileViewer | null;
	readonly reason: string;
}

export type ViewerChoices = Readonly<Record<string, string>>;

export const ViewerChoicesSchema = z.record(z.string(), z.string());

const ENV_NAME = /^\.env(\..+)?$/;
const ENV_EXTENSION = "env";
const CHOSEN = "{path} opens in {viewer}, chosen for .{extension} in file-viewers.json";
const DECLARED = "{path} opens in {viewer}, which declares .{extension}";
const FALLBACK = "{path} opens in {viewer}, which opens any file";
const NONE = "no viewer opens {path}";

// TODO: route file_open through this once the files MCP tool lands; only checks call it today
export function viewerOfFile(path: string, viewers: readonly FileViewer[], choices: ViewerChoices): ChosenViewer {
	const extension = extensionOf(path);
	const chosen = viewers.find(({ id }) => id === choices[extension]);

	if (chosen !== undefined) {
		return answerOf(CHOSEN, chosen, path);
	}

	const declared = viewers.find(({ extensions }) => extensions.includes(extension));

	if (declared !== undefined) {
		return answerOf(DECLARED, declared, path);
	}

	const fallback = viewers.find(({ extensions }) => extensions.includes(ANY_EXTENSION));

	if (fallback !== undefined) {
		return answerOf(FALLBACK, fallback, path);
	}

	return {
		viewer: null,
		reason: NONE.replace("{path}", path),
	};
}

export function extensionOf(path: string): string {
	const name = path.slice(path.lastIndexOf("/") + 1);

	if (ENV_NAME.test(name)) {
		return ENV_EXTENSION;
	}

	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function answerOf(template: string, viewer: FileViewer, path: string): ChosenViewer {
	return {
		viewer,
		reason: template.replace("{path}", path).replace("{viewer}", viewer.id).replace("{extension}", extensionOf(path)),
	};
}
