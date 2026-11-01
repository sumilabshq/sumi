import { FileInfoQuery, ReadFileQuery, WriteFileCommand } from "@sumi/contract";
import type { BoardFile } from "@widgetarium/tasks/module";
import type { StartedApp } from "@widgetarium/core/requests";

const BOARD_PATH = "tasks.json";

export function boardFileOver(sumi: StartedApp): BoardFile {
	return {
		read: async () => {
			const info = await sumi.send(FileInfoQuery, { path: BOARD_PATH });

			if (!info.ok) {
				throw new Error(info.reason);
			}

			if (!info.output.exists) {
				return null;
			}

			const read = await sumi.send(ReadFileQuery, { path: BOARD_PATH });

			if (!read.ok) {
				throw new Error(read.reason);
			}

			return read.output;
		},
		write: async (text) => {
			const written = await sumi.send(WriteFileCommand, {
				path: BOARD_PATH,
				content: text,
			});

			if (!written.ok) {
				throw new Error(written.reason);
			}
		},
	};
}
