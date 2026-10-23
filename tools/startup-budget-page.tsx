import { StrictMode, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import type { WidgetariumProject } from "../packages/core/src/app/widgetarium-project.ts";
import { startTauriStudio } from "../packages/host-tauri/src/index.ts";
import { corePack } from "../packages/packs/core/src/index.ts";

const PROJECT: WidgetariumProject = {
	app: {
		name: "Budget",
		iconHref: "",
	},
	routes: [
		{
			path: "/",
			params: [],
			board: {
				v: 2,
			},
		},
	],
	widgets: {},
	handlers: {},
	packs: [corePack],
};

const root = document.getElementById("root");
if (root === null) {
	throw new Error("the budget page holds no #root");
}

createRoot(root).render(h(StrictMode, null, startTauriStudio(PROJECT)));
