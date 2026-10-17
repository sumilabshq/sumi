import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { saidProgress } from "./spent.js";
import { useTicking } from "./use-ticking.js";

export interface WorkingProps {
	readonly session: AssistantSession;
}

const STILL_BUILDING = "Still building — what you can see is not finished yet.";

export function Working({ session }: WorkingProps): ReactElement {
	useTicking();
	return h("div", { className: "wg-studio-ai-busy" }, [
		h(Icon, { key: "mark", name: "sparkle", size: 14, className: "wg-studio-ai-busy-mark" }),
		h(
			"span",
			{ className: "wg-studio-ai-busy-said", key: "said" },
			saidProgress({
				ms: elapsedSince(session.turns.at(-1)?.startedAt),
				spent: session.spent,
				phase: session.phase,
				tool: session.tool,
			}),
		),
		h("span", { className: "wg-studio-ai-busy-warn", key: "warn" }, STILL_BUILDING),
	]);
}

function elapsedSince(startedAt: number | undefined): number {
	return startedAt === undefined ? 0 : Date.now() - startedAt;
}
