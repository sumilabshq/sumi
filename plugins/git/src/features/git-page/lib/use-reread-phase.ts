import { useEffect, useState } from "react";
import { RereadGitCommand } from "@sumi/git";
import { useCommand, useIsRereading } from "@widgetarium/data-framework";

export type RereadPhase = "idle" | "asking" | "rereading" | "done";

export interface RereadPhaseHandle {
	readonly phase: RereadPhase;
	reread(): void;
}

const LEAST_ASKING_MS = 400;
const DONE_SHOWN_MS = 1200;

export function useRereadPhase(): RereadPhaseHandle {
	const command = useCommand(RereadGitCommand);
	const isRereading = useIsRereading();
	const [phase, setPhase] = useState<RereadPhase>("idle");
	useEffect(() => {
		if (phase === "rereading" && !isRereading) {
			setPhase("done");
		}
	}, [phase, isRereading]);
	useEffect(() => {
		if (phase !== "done") {
			return undefined;
		}

		const timer = window.setTimeout(() => setPhase("idle"), DONE_SHOWN_MS);
		return () => window.clearTimeout(timer);
	}, [phase]);
	return {
		phase,
		reread: () => {
			setPhase("asking");
			void Promise.all([command.run(), pause(LEAST_ASKING_MS)]).then(() => setPhase("rereading"));
		},
	};
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
