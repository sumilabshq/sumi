import { isObject } from "@widgetarium/framework/is-object";
import { hostObject } from "@widgetarium/framework";
import type { FileDragEvent } from "../schema/file-drag.schema.js";

export interface FileDrops {
	fileDragged(heard: (event: FileDragEvent) => void): () => void;
}

export const FileDropsHost = hostObject<FileDrops>("FileDrops", isFileDrops);

function isFileDrops(held: unknown): held is FileDrops {
	return isObject(held) && typeof held["fileDragged"] === "function";
}
