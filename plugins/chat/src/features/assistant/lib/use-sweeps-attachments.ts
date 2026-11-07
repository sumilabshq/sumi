import { useEffect } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { SweepAttachmentsCommand } from "@widgetarium/assistant";

const SWEEP_EVERY_MS = 600000;

export function useSweepsAttachments(isBusy: boolean): void {
	const sweep = useCommand(SweepAttachmentsCommand);
	const run = sweep.run;
	useEffect(() => {
		void run();
	}, [run, isBusy]);
	useEffect(() => {
		const timer = setInterval(() => void run(), SWEEP_EVERY_MS);
		return () => clearInterval(timer);
	}, [run]);
}
