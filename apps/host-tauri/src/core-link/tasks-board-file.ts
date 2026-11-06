import { app } from "@widgetarium/core/requests";
import type { RemoteTransport, StartedApp } from "@widgetarium/core/requests";
import { FileInfoQuery, FileSystemModule, ReadFileQuery, WriteFileCommand } from "@widgetarium/file-system";
import { APP_CALLER_HEADER } from "@widgetarium/studio";
import type { BoardFile } from "@widgetarium/tasks/module";

const TASKS_APP_ID = "tasks";
const BOARD_FILE_PATH = "tasks.json";

export function tasksBoardFileOver(core: RemoteTransport): BoardFile {
	const files = app()
		.imports(FileSystemModule.over(stampCaller(core, TASKS_APP_ID)))
		.start();
	return {
		read: () => readBoardText(files),
		write: (text) => writeBoardText(files, text),
	};
}

async function writeBoardText(files: StartedApp, text: string): Promise<void> {
	const written = await files.send(WriteFileCommand, {
		path: BOARD_FILE_PATH,
		content: text,
	});

	if (!written.ok) {
		throw new Error(written.reason);
	}
}

async function readBoardText(files: StartedApp): Promise<string | null> {
	const info = await files.send(FileInfoQuery, { path: BOARD_FILE_PATH });

	if (!info.ok) {
		throw new Error(info.reason);
	}

	if (!info.output.exists) {
		return null;
	}

	const read = await files.send(ReadFileQuery, { path: BOARD_FILE_PATH });

	if (!read.ok) {
		throw new Error(read.reason);
	}

	return read.output;
}

function stampCaller(core: RemoteTransport, appId: string): RemoteTransport {
	return {
		call: (call) =>
			core.call({
				...call,
				headers: withCaller(call.headers, appId),
			}),
		changes: (hear) => core.changes(hear),
	};
}

function withCaller(headers: Headers | undefined, appId: string): Headers {
	const stamped = new Headers(headers);
	stamped.set(APP_CALLER_HEADER, appId);
	return stamped;
}
