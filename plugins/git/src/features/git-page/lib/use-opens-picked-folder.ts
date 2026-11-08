import { fileSystem } from "@sumi/contract";
import { useCommand } from "@widgetarium/data-framework";

export function useOpensPickedFolder(open: (folder: string) => void): () => Promise<void> {
	const pickFolder = useCommand(fileSystem.files.pickFolder);
	return async () => {
		const answer = await pickFolder.run();

		if (!answer.ok || answer.output.path === null) {
			return;
		}

		open(answer.output.path);
	};
}
