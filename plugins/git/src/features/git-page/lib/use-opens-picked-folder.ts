import { PickFolderCommand } from "@sumi/contract";
import { useCommand } from "@widgetarium/data-framework";

export function useOpensPickedFolder(open: (folder: string) => void): () => Promise<void> {
	const pickFolder = useCommand(PickFolderCommand);
	return async () => {
		const answer = await pickFolder.run();

		if (!answer.ok || answer.output.path === null) {
			return;
		}

		open(answer.output.path);
	};
}
