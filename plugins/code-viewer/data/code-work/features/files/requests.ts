import { fileSystem } from "@sumi/contract";
import { AuthenticatedGuard, refuse } from "@widgetarium/data-framework";
import { query } from "#module";
import { ShowFileAskSchema, ShownFileSchema } from "../../shared/schema/code-work.schema.js";
import { marksOrReasonOf } from "./lib/shown-marks.js";

const MEDIA = /\.(png|jpe?g|gif|webp|avif|bmp|ico|tiff?|heic|mp4|mov|webm|mkv|avi|mp3|wav|ogg|flac|pdf|zip|gz|tar|7z|rar|woff2?|ttf|otf|wasm|exe|dylib|so|o|a|class|jar)$/i;
const NOT_TEXT = "{path} is not a text file; images, video and binaries have their own viewers";
const MISSING = "{path} does not exist";
const NOT_A_FILE = "{path} is a folder, not a file";
const NUL = "\u0000";

export const showFile = query()
	.public()
	.metadata({
		description:
			"Show a whole text file in this chat, opened at the lines you mark, each mark with an optional short note. Use it to point at code or config instead of pasting it: the person scrolls the real file and opens it whole from the card. Any text file; not images, video or binaries.",
		mcp: {
			kind: "read",
			running: "Showing",
			done: "Showed",
			shows: "path",
			ui: { resourceUri: "ui://code-file" },
		},
	})
	.input(ShowFileAskSchema)
	.output(ShownFileSchema)
	.guard(AuthenticatedGuard)
	.handle(async ({ path, marks }, { send }) => {
		const said = (text: string): string => text.replace("{path}", path);

		if (MEDIA.test(path)) {
			return refuse(said(NOT_TEXT));
		}

		const info = await send(fileSystem.files.info, { path });

		if (!info.exists) {
			return refuse(said(MISSING));
		}

		if (info.kind === "folder") {
			return refuse(said(NOT_A_FILE));
		}

		const text = await send(fileSystem.files.read, { path });

		if (text.includes(NUL)) {
			return refuse(said(NOT_TEXT));
		}

		const lineCount = text.split("\n").length;
		const shown = marksOrReasonOf(marks, lineCount);

		if (typeof shown === "string") {
			return refuse(shown);
		}

		const cut = path.lastIndexOf("/");
		return {
			path,
			name: path.slice(cut + 1),
			folder: path.slice(0, cut),
			lineCount,
			marks: [...shown],
		};
	});
