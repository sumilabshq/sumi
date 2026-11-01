import { defineApp } from "@sumi/contract";

export { APP_MANIFEST_FILE } from "@sumi/contract";

export const manifest = defineApp({
	id: "chat",
	name: "Chat",
	version: "0.1.0",
	contract: "^0.3.2",
	ui: "index.html",
	modules: [
		{
			name: "chat",
			runs: "page",
		},
	],
	navigates: true,
});
