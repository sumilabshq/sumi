import { useCommand } from "@widgetarium/core/requests";
import type { AttachedChange, CardAsks } from "./chat-cards-slot.js";
import type { Report } from "./failure-line.js";
import { SendMessageCommand } from "@widgetarium/assistant";
import { answerSettled } from "./answer-settled.js";

export interface ChangeHeld {
	readonly report: Report;
	readonly change: AttachedChange | null;
	readonly setChange: (next: (held: AttachedChange | null) => AttachedChange | null) => void;
}

const NOT_SENT = "the message could not be sent";

export function useChatAsks({ report, change, setChange }: ChangeHeld): CardAsks {
	const sendMessage = useCommand(SendMessageCommand);
	const keptUnless = (isDone: boolean): void => {
		if (!isDone) setChange((held) => held ?? change);
	};
	return {
		report,
		attach: (next) => setChange(() => next),
		runDetached: (running, failedSaid) => {
			setChange(() => null);
			void report(running(), failedSaid).then(keptUnless);
		},
		send: async (said) => {
			setChange(() => null);
			const asked = change ? change.rewrite(said) : said;
			const isSent = await report(answerSettled(sendMessage.run({ said: asked })), NOT_SENT);
			keptUnless(isSent);
			return isSent;
		},
	};
}
