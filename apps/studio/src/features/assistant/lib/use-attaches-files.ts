import { useCommand } from "@widgetarium/framework";
import { AttachFilesCommand } from "@widgetarium/assistant";

export function useAttachesFiles(): (files: readonly File[]) => void {
	const attachFiles = useCommand(AttachFilesCommand);
	return (files) => {
		if (files.length === 0) {
			return;
		}

		void attachFiles.run({ files: [...files] });
	};
}
