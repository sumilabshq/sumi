import { useEffect } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { SweepAttachmentsCommand } from "@widgetarium/assistant";
import { useChatKey } from "../../../shared/lib/chat-key-context.js";

const SWEEP_EVERY_MS = 600000;

export function useSweepsAttachments(isBusy: boolean): void {
	const chat = useChatKey();
	const sweep = useCommand(SweepAttachmentsCommand);
	const run = sweep.run;
	useEffect(() => {
		void run({ chat });
	}, [run, isBusy, chat]);
	useEffect(() => {
		const timer = setInterval(() => void run({ chat }), SWEEP_EVERY_MS);
		return () => clearInterval(timer);
	}, [run, chat]);
}
