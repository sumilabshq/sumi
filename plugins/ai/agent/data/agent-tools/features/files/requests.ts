import { fileSystem, terminal } from "@sumi/contract";
import { AuthenticatedGuard, PerCall, refuse } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { cutLinesOf } from "../../shared/lib/cut-lines.js";
import { sandboxOf, writeRefusalOf } from "../../shared/lib/sandbox.js";
import {
	EditAskedSchema,
	EditedSchema,
	FileTextSchema,
	ImageAskedSchema,
	ImageSchema,
	MatchesAskedSchema,
	MatchesSchema,
	PathsAskedSchema,
	PathsSchema,
	TextAskedSchema,
	WriteAskedSchema,
	WrittenSchema,
} from "../../shared/schema/files.schema.js";
import { editedTextOf } from "./lib/edited-text.js";
import { matchedPathsOf } from "./lib/glob-paths.js";
import { numberedLinesOf } from "./lib/numbered-lines.js";

const READ_LIMIT = 2000;
const MOST_PATHS = 500;
const MOST_MATCHES = 300;
const NO_MATCH_CODE = 1;
const SKIPPED_FOLDERS: readonly string[] = ["node_modules", ".git"];
const NOT_PNG = "{path} is not a PNG: only PNG images can be shown for now";

export const getText = query()
	.public()
	.metadata({
		description:
			"Read a text file, each line numbered. Long files come in parts: give offset and limit to read further. Read a file before you edit it.",
		mcp: { kind: "read", running: "Reading", done: "Read", shows: "path" },
	})
	.input(TextAskedSchema)
	.output(FileTextSchema)
	.handle(async ({ path, offset, limit }, { send }) =>
		numberedLinesOf(await send(fileSystem.files.read, { path }), offset ?? 1, limit ?? READ_LIMIT),
	);

export const write = command()
	.public()
	.metadata({
		description:
			"Write a whole file, creating it or replacing what is there. For a change inside an existing file use agent-tools_files_edit.",
		mcp: { kind: "edit", running: "Writing", done: "Wrote", shows: "path" },
	})
	.input(WriteAskedSchema)
	.output(WrittenSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ path, content }, { send, user }) => {
		const refusal = writeRefusalOf(sandboxOf(user), path);

		if (refusal !== null) {
			console.info(`[agent-tools] ${user.id}: ${path} write refused by the sandbox`);
			return refuse(refusal);
		}

		await send(fileSystem.files.write, { path, content });
		console.info(`[agent-tools] ${user.id}: ${path} → written, ${String(content.length)} characters`);
		return { path, lines: content.split("\n").length };
	});

export const edit = command()
	.public()
	.metadata({
		description:
			"Replace text in a file: oldText must be in the file exactly once, unless replaceAll is set. Copy oldText from what agent-tools_files_get-text showed, without the line numbers.",
		mcp: { kind: "edit", running: "Editing", done: "Edited", shows: "path" },
	})
	.input(EditAskedSchema)
	.output(EditedSchema)
	.idempotencyKey(PerCall)
	.guard(AuthenticatedGuard)
	.handle(async ({ path, oldText, newText, replaceAll }, { send, user }) => {
		const refusal = writeRefusalOf(sandboxOf(user), path);

		if (refusal !== null) {
			console.info(`[agent-tools] ${user.id}: ${path} edit refused by the sandbox`);
			return refuse(refusal);
		}

		const text = await send(fileSystem.files.read, { path });
		const edited = editedTextOf(path, text, { oldText, newText, replaceAll: replaceAll ?? false });

		if ("refusal" in edited) {
			return refuse(edited.refusal);
		}

		await send(fileSystem.files.write, { path, content: edited.text });
		console.info(`[agent-tools] ${user.id}: ${path} → edited, ${String(edited.replaced)} replaced`);
		return { path, replaced: edited.replaced };
	});

// TRADE-OFF: find and grep, not ripgrep: ripgrep is faster but not on every machine
export const findPaths = command()
	.public()
	.metadata({
		description:
			"Find files by a glob under a folder, such as **/*.ts. Skips node_modules and .git. Answers absolute paths, sorted.",
		mcp: { kind: "search", running: "Finding", done: "Found", shows: "pattern" },
	})
	.input(PathsAskedSchema)
	.output(PathsSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ folder, pattern }, { send }) => {
		const found = await send(terminal.programs.run, {
			folder,
			program: "find",
			args: [
				folder,
				...SKIPPED_FOLDERS.flatMap((skipped) => ["-name", skipped, "-prune", "-o"]),
				"-type",
				"f",
				"-print",
			],
		});
		const paths = matchedPathsOf(found.out, folder, pattern);
		return { paths: paths.slice(0, MOST_PATHS), isCut: paths.length > MOST_PATHS };
	});

export const findMatches = command()
	.public()
	.metadata({
		description:
			"Search file contents under a folder with an extended regular expression. Answers path:line:text for each matching line. Skips node_modules, .git and binary files.",
		mcp: { kind: "search", running: "Searching", done: "Searched", shows: "pattern" },
	})
	.input(MatchesAskedSchema)
	.output(MatchesSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ folder, pattern, files, ignoreCase }, { send }) => {
		const found = await send(terminal.programs.run, {
			folder,
			program: "grep",
			args: [
				"-rnIE",
				...(ignoreCase === true ? ["-i"] : []),
				...(files === undefined ? [] : [`--include=${files}`]),
				...SKIPPED_FOLDERS.map((skipped) => `--exclude-dir=${skipped}`),
				"-e",
				pattern,
				folder,
			],
		});

		if (found.code !== 0 && found.code !== NO_MATCH_CODE) {
			return refuse(found.err.trim());
		}

		return cutLinesOf(found.out, MOST_MATCHES, "first");
	});

export const getImage = query()
	.public()
	.metadata({
		description: "Look at a PNG image file: answers the image itself.",
		mcp: { kind: "read", running: "Looking at", done: "Looked at", shows: "path" },
	})
	.input(ImageAskedSchema)
	.output(ImageSchema)
	.handle(async ({ path }, { send }) => {
		if (!path.toLowerCase().endsWith(".png")) {
			return refuse(NOT_PNG.replace("{path}", path));
		}

		return { png: await send(fileSystem.files.readBytes, { path }), path };
	});
