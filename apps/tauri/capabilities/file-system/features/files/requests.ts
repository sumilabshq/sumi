import { CallLoggerMiddleware, PerCall, Repeatable, guard } from "@widgetarium/data-framework";
import { command, query } from "#module";
import type { Invalidate } from "@widgetarium/data-framework";
import { placedIn, refuseFailure } from "../../shared/lib/app-path.js";
import {
	FileBytesSchema,
	FileContentSchema,
	FileInfoSchema,
	FolderSchema,
	LocateFileInputSchema,
	LocatedFileSchema,
	MoveInputSchema,
	PathInputSchema,
	PickedFolderSchema,
	WriteFileInputSchema,
} from "../../shared/schema/files.schema.js";

const PATH_KEYS: readonly string[] = ["path", "from", "to"];

// TODO: per-app grants (folders, no remove); every app reaches every path today
export const FileAccessGuard = guard()
	.needsUser()
	.handle(() => undefined);

export const FileCallLoggerMiddleware = CallLoggerMiddleware("file-system", (input) => JSON.stringify(pathsOf(input)));

export const ReadFileQuery = query("read-file")
	.public()
	.input(PathInputSchema)
	.output(FileContentSchema)
	.handle(async ({ path }, { files, user }) => files.readFile(await placedIn(files, user, path)).catch(refuseFailure));

export const ReadFileBytesQuery = query("read-file-bytes")
	.public()
	.input(PathInputSchema)
	.output(FileBytesSchema)
	.handle(async ({ path }, { files, user }) =>
		files.readFileBytes(await placedIn(files, user, path)).catch(refuseFailure),
	);

export const OpenInSystemAppCommand = command("open-in-system-app")
	.public()
	.input(PathInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ path }, { files, user }) => {
		const placed = await placedIn(files, user, path);
		await files.openInSystemApp(placed).catch(refuseFailure);
		console.info(`[file-system] ${placed} opened in its system app`);
	});

export const ReadFolderQuery = query("read-folder")
	.public()
	.input(PathInputSchema)
	.output(FolderSchema)
	.handle(async ({ path }, { files, user }) => {
		const entries = await files.readFolder(await placedIn(files, user, path)).catch(refuseFailure);
		return {
			entries: [...entries],
		};
	});

export const FileInfoQuery = query("file-info")
	.public()
	.input(PathInputSchema)
	.output(FileInfoSchema)
	.handle(async ({ path }, { files, user }) => files.fileInfo(await placedIn(files, user, path)));

export const LocatedFileQuery = query("located-file")
	.public()
	.input(LocateFileInputSchema)
	.output(LocatedFileSchema)
	.handle(async ({ path, identity }, { files, user }) => ({
		path: await files.locatedFile(await placedIn(files, user, path), identity),
	}));

export const PickFolderCommand = command("pick-folder")
	.public()
	.output(PickedFolderSchema)
	.idempotencyKey(PerCall)
	.handle(async (_input, { files }) => {
		const path = await files.pickedFolder();
		console.info(`[file-system] folder dialog → ${path ?? "cancelled"}`);
		return {
			path,
		};
	});

export const WriteFileCommand = command("write-file")
	.public()
	.input(WriteFileInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ path, content }, { files, user, invalidate }) => {
		await files.writeFile(await placedIn(files, user, path), content);
		rereadFiles(invalidate);
	});

export const AppendFileCommand = command("append-file")
	.public()
	.input(WriteFileInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ path, content }, { files, user, invalidate }) => {
		await files.appendFile(await placedIn(files, user, path), content);
		rereadFiles(invalidate);
	});

export const MakeFolderCommand = command("make-folder")
	.public()
	.input(PathInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ path }, { files, user, invalidate }) => {
		await files.makeFolder(await placedIn(files, user, path));
		rereadFiles(invalidate);
	});

export const RemoveCommand = command("remove")
	.public()
	.input(PathInputSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ path }, { files, user, invalidate }) => {
		await files.remove(await placedIn(files, user, path));
		rereadFiles(invalidate);
	});

export const RenameCommand = command("rename")
	.public()
	.input(MoveInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ from, to }, { files, user, invalidate }) => {
		await files.rename(await placedIn(files, user, from), await placedIn(files, user, to));
		rereadFiles(invalidate);
	});

export const CopyCommand = command("copy")
	.public()
	.input(MoveInputSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ from, to }, { files, user, invalidate }) => {
		await files.copy(await placedIn(files, user, from), await placedIn(files, user, to));
		rereadFiles(invalidate);
	});

// TRADE-OFF: any write re-reads every read; matching a written path to each read's input is planned
function rereadFiles(invalidate: Invalidate): void {
	invalidate(ReadFileQuery);
	invalidate(ReadFolderQuery);
	invalidate(FileInfoQuery);
}

function pathsOf(input: unknown): readonly unknown[] {
	if (typeof input !== "object" || input === null) {
		return [];
	}

	return PATH_KEYS.filter((key) => key in input).map((key) => Reflect.get(input, key));
}
