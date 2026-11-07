import { useMemo } from "react";
import { ReadFileQuery } from "@sumi/contract";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { ViewerChoicesSchema } from "./viewer-of-file.js";
import type { ViewerChoices } from "./viewer-of-file.js";

const CHOICES_FILE = "file-viewers.json";
const NO_CHOICES: ViewerChoices = {};
const UNREADABLE = "[files] file-viewers.json is not a map of extension to viewer, so no viewer is chosen by it";

// TRADE-OFF: read in the view; a tab's frame reaches no plugin module of the core, only its file system
export function useViewerChoices(): ViewerChoices | null {
	const read = useOptionalQuery(ReadFileQuery, { path: CHOICES_FILE });
	return useMemo(() => {
		if (read.failure !== null) {
			return NO_CHOICES;
		}

		return read.data === null ? null : choicesOf(read.data);
	}, [read.data, read.failure]);
}

function choicesOf(text: string): ViewerChoices {
	const parsed = ViewerChoicesSchema.safeParse(parsedJsonOf(text));

	if (!parsed.success) {
		console.warn(UNREADABLE);
		return NO_CHOICES;
	}

	return parsed.data;
}

function parsedJsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
