import { useCommand } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { useChatKey } from "../../../shared/lib/chat-key-context.js";

export function useAttachesFiles(): (files: readonly File[]) => void {
	const chat = useChatKey();
	const attachFiles = useCommand(assistant.composer.attachFiles);
	return (files) => {
		if (files.length === 0) {
			return;
		}

		void attachFiles.run({ chat, files: [...files] });
	};
}
