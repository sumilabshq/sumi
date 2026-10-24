import { createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/core/src/requests/index.ts";
import { MascotClientModule } from "../packages/client/mascot/generated/module.ts";
import { memoryMascotParts } from "../packages/client/mascot/generated/gateways.ts";
import {
	Mascot,
	MascotFigure,
	MascotStateSchema,
	OutfitIdSchema,
	RecordAgentEventsCommand,
} from "../packages/client/mascot/generated/index.ts";
import type { AgentEvent, OutfitId } from "../packages/client/mascot/generated/index.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const started = app({ modules: [MascotClientModule.with(memoryMascotParts())] });
const host = document.getElementById("root");
if (host === null) {
	throw new Error("mascot page: no #root");
}

Object.assign(window, {
	__RECORD__: (events: AgentEvent[]) => started.send(RecordAgentEventsCommand, { events }),
});

function Live() {
	const [outfit, wear] = useState<OutfitId>("bare");
	Object.assign(window, { __WEAR__: wear });
	return h("div", { id: "live" }, h(AppProvider, { app: started }, h(Mascot, { outfit, size: 180 })));
}

const isQuiet = location.hash === "#quiet";
createRoot(host).render(
	h("div", { className: "wg-root mascot-page" }, [
		h(Live, { key: "live" }),
		isQuiet
			? null
			: h(
					"div",
					{ key: "row", id: "states" },
					MascotStateSchema.options.map((state) =>
						h("div", { key: state, "data-row": state }, h(MascotFigure, { outfit: "bare", size: 90, state })),
					),
				),
		isQuiet
			? null
			: h(
					"div",
					{ key: "outfits", id: "outfits" },
					OutfitIdSchema.options.map((outfit) =>
						h("div", { key: outfit, "data-outfit-row": outfit }, h(MascotFigure, { outfit, size: 60, state: "idle" })),
					),
				),
		isQuiet
			? null
			: h(
					"div",
					{ key: "dark", id: "dark", className: "theme-dark" },
					h(MascotFigure, { outfit: "bare", size: 60, state: "idle" }),
				),
	]),
);
