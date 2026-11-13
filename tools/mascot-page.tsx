import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider, runtime } from "../packages/shared/data-framework/src/index.ts";
import { Mascot } from "../plugins/ai/chat/src/features/mascot/ui/mascot/mascot.tsx";
import { SumiFigure } from "../plugins/sumi-host/src/features/mascot/ui/sumi-figure/sumi-figure.tsx";
import { SUMI_STATES } from "../plugins/sumi-host/src/features/mascot/lib/sumi-state.ts";
import { mascot } from "../plugins/ai/chat/data/mascot/generated/contract.ts";
import type { AgentEvent } from "../plugins/ai/chat/data/mascot/generated/contract.ts";
import { mascot as mascotModule } from "../plugins/ai/chat/data/mascot/generated/module.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const LIVE_PX = 180;
const ROW_PX = 14;

const started = runtime()
	.modules(mascotModule)
	.start({
		platform: "browser",
		scope: {
			workspaceId: "mascot-page",
		},
	});
const host = document.getElementById("root");

if (host === null) {
	throw new Error("mascot page: no #root");
}

Object.assign(window, {
	__RECORD__: (events: AgentEvent[]) => started.send(mascot.activity.recordAgentEvents, { events }),
});

const states = h(
	"div",
	{
		key: "states",
		id: "states",
	},
	SUMI_STATES.map((state) =>
		h(
			"div",
			{
				key: state,
				"data-row": state,
			},
			h(SumiFigure, {
				state,
				size: ROW_PX,
			}),
		),
	),
);
const dark = h(
	"div",
	{
		key: "dark",
		id: "dark",
		className: "theme-dark",
	},
	h(SumiFigure, {
		state: "rest",
		size: ROW_PX,
	}),
);
const live = h(
	"div",
	{
		key: "live",
		id: "live",
	},
	h(
		RuntimeProvider,
		{
			runtime: started,
		},
		h(Mascot, {
			size: LIVE_PX,
		}),
	),
);
const isQuiet = location.hash === "#quiet";
createRoot(host).render(
	h(
		"div",
		{
			className: "wg-root mascot-page",
		},
		isQuiet ? [states, dark] : [live, states, dark],
	),
);
