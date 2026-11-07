import { useCommand } from "@widgetarium/data-framework";
import { AttachFilesCommand } from "@widgetarium/assistant";
import { useChatKey } from "../../../shared/lib/chat-key-context.js";

export function useAttachesFiles(): (files: readonly File[]) => void {
	const chat = useChatKey();
	const attachFiles = useCommand(AttachFilesCommand);
	return (files) => {
		if (files.length === 0) {
			return;
		}

		void attachFiles.run({ chat, files: [...files] });
	};
}
