import { defineApp } from "@sumi/contract";

export { APP_MANIFEST_FILE } from "@sumi/contract";

export const manifest = defineApp({
	id: "tasks",
	name: "Tasks",
	version: "0.1.0",
	contract: "^0.5.0",
	ui: "index.html",
	modules: [
		{
			name: "tasks",
			runs: "page",
		},
	],
	navigates: true,
});
