import { useCommand } from "@widgetarium/core/requests";
import { AttachFilesCommand } from "../contract.js";

export function useAttachesFiles(): (files: readonly File[]) => void {
	const attachFiles = useCommand(AttachFilesCommand);
	return (files) => {
		if (files.length === 0) {
			return;
		}

		void attachFiles.run({ files: [...files] });
	};
}
