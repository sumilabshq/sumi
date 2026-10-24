import { useCommand } from "@widgetarium/core/requests";
import type { AttachedChange, CardAsks } from "../../../shared/lib/chat-cards-slot.js";
import type { Report } from "../../../shared/lib/failure-line.js";
import { SendMessageCommand } from "../contract.js";

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
			const isSent = await report(settled(sendMessage.run({ said: asked })), NOT_SENT);
			keptUnless(isSent);
			return isSent;
		},
	};
}

type Answered = { readonly ok: true } | { readonly ok: false; readonly reason: string };

async function settled(answering: Promise<Answered>): Promise<void> {
	const answer = await answering;

	if (!answer.ok) {
		throw new Error(answer.reason);
	}
}
