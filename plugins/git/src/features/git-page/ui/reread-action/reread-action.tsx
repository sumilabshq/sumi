import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useRereadPhase } from "../../lib/use-reread-phase.js";
import type { RereadPhase } from "../../lib/use-reread-phase.js";
import { RepoOnly } from "../repo-only/repo-only.js";

const LABELS: Readonly<Record<RereadPhase, string>> = {
	idle: "Refresh",
	asking: "Refreshing",
	rereading: "Refreshing",
	done: "Refreshed",
};

export function RereadAction({ tabId }: AppViewProps): ReactElement {
	const { Action } = useTabHeader();
	const { phase, reread } = useRereadPhase();
	return (
		<RepoOnly tabId={tabId}>
			<Action
				label={LABELS[phase]}
				icon="rotate-cw"
				isBusy={phase === "asking" || phase === "rereading"}
				isDone={phase === "done"}
				onPress={reread}
			/>
		</RepoOnly>
	);
}
