import { useEffect } from "react";
import type { RefObject } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { SendMessageCommand } from "@widgetarium/assistant";
import { RUN_COMMAND_EVENT } from "../../markdown/code-block.js";

type SendSaid = (said: string) => Promise<unknown>;

const RUN_ASK = "Run this command:\n\n```bash\n{command}\n```";

export function useRunsCodeCommands(holder: RefObject<HTMLDivElement | null>): void {
	const sendMessage = useCommand(SendMessageCommand);
	useEffect(() => {
		const node = holder.current;

		if (!node) {
			return undefined;
		}

		const askToRun = askToRunWith((said) => sendMessage.run({ said }));
		node.addEventListener(RUN_COMMAND_EVENT, askToRun);
		return () => node.removeEventListener(RUN_COMMAND_EVENT, askToRun);
	}, [holder, sendMessage]);
}

function askToRunWith(send: SendSaid): (event: Event) => void {
	return (event) => {
		if (!(event instanceof CustomEvent) || typeof event.detail !== "string") {
			console.warn("[sumi-chat] a run ask without a command text was dropped", event);
			return;
		}

		send(RUN_ASK.replace("{command}", event.detail)).catch((error: unknown) => {
			console.error("[sumi-chat] the command was not sent to the agent", error);
		});
	};
}
