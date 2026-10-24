import { joinProjectPath } from "./project-files.js";

export interface ProjectWriter {
	write(path: string, text: string): Promise<void>;
}

export interface NodeFileWriter {
	mkdir(path: string, options: { recursive: true }): Promise<unknown>;
	writeFile(path: string, text: string): Promise<void>;
}

export function nodeProjectWriter(root: string, fileSystem: NodeFileWriter): ProjectWriter {
	return {
		write: async (at, text) => {
			const absolute = joinProjectPath(root, at);
			await fileSystem.mkdir(absolute.slice(0, absolute.lastIndexOf("/")), { recursive: true });
			await fileSystem.writeFile(absolute, text);
		},
	};
}
