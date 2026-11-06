import { defineApp } from "@sumi/contract";

export { APP_MANIFEST_FILE } from "@sumi/contract";

export const manifest = defineApp({
	id: "browser-page",
	name: "Browser",
	version: "0.1.0",
	contract: "^0.4.0",
	ui: "index.html",
	modules: [
		{
			name: "browser-page",
			runs: "page",
		},
	],
	navigates: true,
});
