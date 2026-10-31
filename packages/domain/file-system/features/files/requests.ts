import { PerCall, Repeatable, command, guard, middleware, query } from "@widgetarium/core/requests";
import type { Invalidate } from "@widgetarium/core/requests";
import { FilesGateway } from "../../gateways/files/files.gateway.js";
import { placedIn, refusedFailure } from "../../shared/lib/app-path.js";
import {
	FileContentSchema,
	FileInfoSchema,
	FolderSchema,
	MoveInputSchema,
	PathInputSchema,
	WriteFileInputSchema,
} from "../../shared/schema/files.schema.js";

const CALLED = "[file-system] app {app} → {request} {paths}";
const PATH_KEYS: readonly string[] = ["path", "from", "to"];

// TODO: per-app grants (folders, no remove); every app reaches every path today
export const FileAccessGuard = guard()
	.needsUser()
	.handle(() => undefined);

export const FileCallLoggerMiddleware = middleware().handle(({ request, input, context }, _injected, next) => {
	console.info(
		CALLED.replace("{app}", context.user?.id ?? "none")
			.replace("{request}", request)
			.replace("{paths}", JSON.stringify(pathsOf(input))),
	);
	return next();
});

export const ReadFileQuery = query("read-file")
	.input(PathInputSchema)
	.output(FileContentSchema)
	.inject({ files: FilesGateway })
	.handle(async ({ path }, { files, user }) => files.readFile(await placedIn(files, user, path)).catch(refusedFailure));

export const ReadFolderQuery = query("read-folder")
	.input(PathInputSchema)
	.output(FolderSchema)
	.inject({ files: FilesGateway })
	.handle(async ({ path }, { files, user }) => {
		const entries = await files.readFolder(await placedIn(files, user, path)).catch(refusedFailure);
		return {
			entries: [...entries],
		};
	});

export const FileInfoQuery = query("file-info")
	.input(PathInputSchema)
	.output(FileInfoSchema)
	.inject({ files: FilesGateway })
	.handle(async ({ path }, { files, user }) => files.fileInfo(await placedIn(files, user, path)));

export const WriteFileCommand = command("write-file")
	.input(WriteFileInputSchema)
	.idempotencyKey(Repeatable)
	.inject({ files: FilesGateway })
	.handle(async ({ path, content }, { files, user, invalidate }) => {
		await files.writeFile(await placedIn(files, user, path), content);
		rereadFiles(invalidate);
	});

export const AppendFileCommand = command("append-file")
	.input(WriteFileInputSchema)
	.idempotencyKey(PerCall)
	.inject({ files: FilesGateway })
	.handle(async ({ path, content }, { files, user, invalidate }) => {
		await files.appendFile(await placedIn(files, user, path), content);
		rereadFiles(invalidate);
	});

export const MakeFolderCommand = command("make-folder")
	.input(PathInputSchema)
	.idempotencyKey(Repeatable)
	.inject({ files: FilesGateway })
	.handle(async ({ path }, { files, user, invalidate }) => {
		await files.makeFolder(await placedIn(files, user, path));
		rereadFiles(invalidate);
	});

export const RemoveCommand = command("remove")
	.input(PathInputSchema)
	.idempotencyKey(Repeatable)
	.inject({ files: FilesGateway })
	.handle(async ({ path }, { files, user, invalidate }) => {
		await files.remove(await placedIn(files, user, path));
		rereadFiles(invalidate);
	});

export const RenameCommand = command("rename")
	.input(MoveInputSchema)
	.idempotencyKey(PerCall)
	.inject({ files: FilesGateway })
	.handle(async ({ from, to }, { files, user, invalidate }) => {
		await files.rename(await placedIn(files, user, from), await placedIn(files, user, to));
		rereadFiles(invalidate);
	});

export const CopyCommand = command("copy")
	.input(MoveInputSchema)
	.idempotencyKey(PerCall)
	.inject({ files: FilesGateway })
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
