import { createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/framework/src/index.ts";
import { Mascot } from "../apps/chat/src/features/mascot/ui/mascot/mascot.tsx";
import { MascotFigure } from "../apps/studio/src/features/mascot/ui/mascot-figure/mascot-figure.tsx";
import { MascotStateSchema } from "../apps/studio/src/features/mascot/lib/mascot-state.schema.ts";
import { OutfitIdSchema } from "../apps/studio/src/features/mascot/lib/outfit.schema.ts";
import type { OutfitId } from "../apps/studio/src/features/mascot/lib/outfit.schema.ts";
import { RecordAgentEventsCommand } from "../packages/domain/mascot/index.ts";
import type { AgentEvent } from "../packages/domain/mascot/index.ts";
import { MascotModule } from "../packages/domain/mascot/module.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const started = app()
	.modules(MascotModule)
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
