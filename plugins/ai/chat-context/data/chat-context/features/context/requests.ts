import { terminal } from "@sumi/contract";
import type { ProgramOutput } from "@sumi/contract";
import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { command, query } from "#module";
import {
	ChatContextSchema,
	EnterInputSchema,
	FINDER,
	FOUND_EDITORS,
	FolderInputSchema,
	OpenInInputSchema,
} from "../../shared/schema/chat-context.schema.js";
import type { Editor } from "../../shared/schema/chat-context.schema.js";

const APPLICATIONS = "/Applications";
const APP_SUFFIX = ".app";
const OPEN_PROGRAM = "open";
const NEW_TERMINAL_SIZE = { cols: 80, rows: 24 };
const OPEN_FAILED = "{editor} could not open {folder}: {reason}";
const REVEAL_FAILED = "Finder could not reveal {folder}: {reason}";

export const read = query()
	.public()
	.input(FolderInputSchema)
	.output(ChatContextSchema)
	.handle(async ({ folder }, { send, editorChoice }) => {
		const [branch, editors] = await Promise.all([branchAt(send, folder), installedEditors(send)]);
		const chosen = editorChoice.chosen();
		return {
			folder,
			name: folder.split("/").filter(Boolean).at(-1) ?? folder,
			branch,
			editors,
			editor: chosen !== null && editors.includes(chosen) ? chosen : (editors[0] ?? FINDER),
		};
	});

export const reread = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { invalidate }) => {
		invalidate(read);
	});

export const openIn = command()
	.public()
	.input(OpenInInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ folder, editor }, { send, editorChoice, invalidate }) => {
		const was = editorChoice.chosen();
		editorChoice.choose(editor);
		console.info(`[chat-context] editor ${was ?? "none"} → ${editor}`);
		invalidate(read);
		const opened = await send(terminal.programs.run, { folder, program: OPEN_PROGRAM, args: ["-a", editor, folder] });

		if (opened.code !== 0) {
			return refuse(
				OPEN_FAILED.replace("{editor}", editor).replace("{folder}", folder).replace("{reason}", opened.err.trim()),
			);
		}
	});

export const reveal = command()
	.public()
	.input(FolderInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ folder }, { send }) => {
		const revealed = await send(terminal.programs.run, { folder, program: OPEN_PROGRAM, args: ["-R", folder] });

		if (revealed.code !== 0) {
			return refuse(REVEAL_FAILED.replace("{folder}", folder).replace("{reason}", revealed.err.trim()));
		}
	});

export const enterIn = command()
	.public()
	.input(EnterInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ session, folder }, { send }) => {
		await send(terminal.lines.resize, { session, ...NEW_TERMINAL_SIZE });
		await send(terminal.lines.typeText, { session, keys: `cd ${shellQuoted(folder)}\r` });
	});

function shellQuoted(path: string): string {
	return `'${path.replaceAll("'", `'\\''`)}'`;
}

async function branchAt(send: Send, folder: string): Promise<string | null> {
	const head: ProgramOutput | null = await send(terminal.programs.run, {
		folder,
		program: "git",
		args: ["--no-optional-locks", "rev-parse", "--abbrev-ref", "HEAD"],
	}).catch(() => null);
	return head !== null && head.code === 0 ? head.out.trim() : null;
}

async function installedEditors(send: Send): Promise<Editor[]> {
	const listed = await send(terminal.programs.run, { folder: APPLICATIONS, program: "ls", args: ["-1"] }).catch(
		() => null,
	);
	const apps = new Set((listed?.out ?? "").split("\n"));
	return [...FOUND_EDITORS.filter((editor) => apps.has(`${editor}${APP_SUFFIX}`)), FINDER];
}
