import { useEffect, useRef } from "react";
import { RereadGitCommand } from "@sumi/git";
import { useCommand } from "@widgetarium/data-framework";

const REREAD_EVERY_MS = 5000;

export function useRereadsWhileShown(): void {
	const reread = useCommand(RereadGitCommand);
	const latestReread = useRef(reread);
	latestReread.current = reread;
	useEffect(() => {
		const rereadIfSeen = (): void => {
			if (document.visibilityState === "visible" && document.hasFocus()) {
				void latestReread.current.run();
			}
		};
		// TODO: a file watcher on the repo in place of polling
		const timer = window.setInterval(rereadIfSeen, REREAD_EVERY_MS);
		window.addEventListener("focus", rereadIfSeen);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("focus", rereadIfSeen);
		};
	}, []);
}
