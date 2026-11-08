import type { FilledApp } from "@sumi/apps-plugin";

export const ANY_EXTENSION = "*";

export interface FileViewer extends FilledApp {
	readonly extensions: readonly string[];
}
