import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";

const THEMES: readonly Theme[] = ["light", "dark"];
const SHEETS = [
	"plugins/ai/chat/src/features/assistant/ui/assistant-panel/assistant.css",
	"plugins/ai/plan-usage/src/features/plan-usage/ui/usage-button/usage-button.css",
];
const out = process.argv[2] ?? path.join(mkdtempSync(path.join(tmpdir(), "sumi-composer-bar-")), "bar");
const script = await bundleOf("tools/scratch-composer-bar-page.tsx");

for (const theme of THEMES) {
	const page = `${out}-${theme}.html`;
	writeFileSync(
		page,
		shotPage({
			theme,
			title: "Composer bar",
			lead: "pickers with chevrons, usage ring at 0, 35, 80 percent; second bar is working",
			body: `${SHEETS.map((sheet) => `<style>${readFileSync(sheet, "utf8")}</style>`).join("")}<script>${script}</script>`,
		}),
	);
	shoot(page, [`--screenshot=${out}-${theme}.png`], { width: 640, height: 300 });
	console.log(`${out}-${theme}.png`);
}
