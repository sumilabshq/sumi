import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";
import type { Plugin } from "vite";
import { widgetarium } from "@widgetarium/vite";

const markdownAsText: Plugin = {
	name: "markdown-as-text",
	enforce: "pre",
	transform(code, id) {
		if (!id.endsWith(".md")) {
			return null;
		}

		return {
			code: `export default ${JSON.stringify(code)};`,
			map: null,
		};
	},
};

export default defineConfig({
	plugins: [markdownAsText, react(), tailwindcss(), widgetarium()],
	resolve: {
		conditions: ["source", ...defaultClientConditions],
	},
});
