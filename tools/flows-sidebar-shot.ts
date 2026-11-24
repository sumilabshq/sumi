import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";
import { doubleClickOn, hoverOn, openedSidebar } from "./flows-sidebar-harness.ts";

const OUT = process.argv[2] ?? "/tmp/flows-sidebar-shots";
const FOLDER_FLOW = ".sumi-flows-folder .sumi-flows-row[data-kind=flow]";

type Step = (page: AskedPage) => Promise<void>;

const SCENES: Readonly<Record<string, { readonly scene: string; readonly steps: readonly Step[] }>> = {
	inbox: { scene: "inbox", steps: [] },
	opened: { scene: "opened", steps: [] },
	quiet: { scene: "quiet", steps: [] },
	hidden: { scene: "hidden", steps: [] },
	peeking: { scene: "peeking", steps: [] },
	"folder-hover": { scene: "inbox", steps: [(page) => hoverOn(page, ".sumi-flows-row[data-kind=folder]", "Sumi", 200)] },
	"chats-hover": { scene: "inbox", steps: [(page) => hoverOn(page, FOLDER_FLOW, "Composer redesign", 900)] },
	rename: { scene: "inbox", steps: [(page) => doubleClickOn(page, ".sumi-flows-row-main", "Client project")] },
	picker: {
		scene: "inbox",
		steps: [
			(page) => doubleClickOn(page, ".sumi-flows-row-main", "Client project"),
			async (page) => {
				await waited(300);
				const [x, y] = (await page.ask(
					`(() => { const box = document.querySelector(".sumi-flows-field-icon").getBoundingClientRect(); return [box.left + 10, box.top + 10]; })()`,
				)) as [number, number];
				await page.press(x, y);
				await waited(400);
			},
		],
	},
};

async function shoot(bundled: string, name: string, theme: string): Promise<void> {
	const { scene, steps } = SCENES[name] ?? { scene: "inbox", steps: [] };
	const opened = await openedSidebar(bundled, theme, scene);

	for (const step of steps) {
		await step(opened.page);
	}

	writeFileSync(path.join(OUT, `${name}-${theme}.png`), await opened.page.shoot());
	const failures = opened.page.failures();
	opened.stop();

	if (failures.length > 0) {
		console.log(`${name}-${theme}: ${failures.join(" | ")}`);
	}
}

mkdirSync(OUT, { recursive: true });
const bundled = await bundleOf("tools/flows-sidebar-page.tsx");
const names = process.argv[3] ? [process.argv[3]] : Object.keys(SCENES);

for (const theme of ["light", "dark"]) {
	for (const name of names) {
		await shoot(bundled, name, theme);
	}
}

console.log(`shots in ${OUT}`);
