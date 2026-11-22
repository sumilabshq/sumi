import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { BackgroundAgentsView } from "../plugins/ai/background-agents/src/features/background-agents/ui/background-agents/background-agents.tsx";
import type { ShownAgent } from "../plugins/ai/background-agents/src/features/background-agents/lib/background-words.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const NOW = Date.now();
const MINUTE = 60000;

const fixKit: ShownAgent = {
	id: "a-1",
	ref: "t-1",
	title: "Fix kit and tokens",
	state: "working",
	said: "Running npm run test:kit",
	startedAt: NOW - 6 * MINUTE - 12000,
	endedAt: null,
};
const auditViewers: ShownAgent = {
	id: "a-2",
	ref: "t-2",
	title: "Audit viewers and apps",
	state: "working",
	said: "Reading viewer-frame.tsx",
	startedAt: NOW - 2 * MINUTE - 40000,
	endedAt: null,
};
const auditCanvas: ShownAgent = {
	id: "a-3",
	ref: "t-3",
	title: "Audit canvas kit adoption",
	state: "done",
	said: "Found 3 places that draw their own rounding",
	startedAt: NOW - 9 * MINUTE,
	endedAt: NOW - 2 * MINUTE,
};

function Demo(): ReactElement {
	return (
		<div className="demo">
			<div className="demo-label">Collapsed while working</div>
			<BackgroundAgentsView agents={[fixKit, auditViewers, auditCanvas]} />
			<div className="demo-label">Opened</div>
			<BackgroundAgentsView agents={[fixKit, auditViewers, auditCanvas]} isOpenAtFirst={true} />
			<div className="demo-label">Everything ended</div>
			<BackgroundAgentsView
				agents={[
					auditCanvas,
					{
						...fixKit,
						state: "stopped",
						said: "The chat session ended before this background agent finished.",
						endedAt: NOW,
					},
				]}
				isOpenAtFirst={true}
			/>
		</div>
	);
}

const root = document.getElementById("root");
if (root !== null) {
	createRoot(root).render(<Demo />);
}
