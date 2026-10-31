import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { composerDiffReport } from "./chat-composer-diff.ts";
import { UNJUDGED } from "./chat-composer-probe.ts";
import { bundleOf } from "./harness.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const SHEETS = ["packages/shared/core/browser-host.css", "apps/host-obsidian/styles.css"];
const SEEN = `(() => ({
	header: document.querySelectorAll(".wg-studio-ai-head:not(.is-bare)").length,
	strip: document.querySelectorAll("[data-claude-strip]").length,
	folder: document.querySelectorAll('.wg-studio-ai-strip-button[aria-label="Choose a folder"]').length,
	welcome: document.querySelectorAll(".wg-studio-ai-welcome").length,
	bar: [...document.querySelectorAll(".wg-studio-ai-field-bar")].map((bar) => bar.textContent).join(""),
	model: document.querySelector(".wg-studio-ai-strip-button[aria-label=Model]")?.textContent ?? null,
}))()`;

let failed = 0;

function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

async function seenIn(state: string, bundled: string): Promise<unknown> {
	const sheets = SHEETS.map((at) => readFileSync(path.join(REPO, at), "utf8")).join("\n");
	const html = `<!doctype html><html><head><meta charset="utf-8"><style>${sheets}</style></head><body class="theme-light"><div class="wg-studio-chat" style="width:752px;height:820px"><div id="chat" style="height:100%"></div></div><script>${bundled.replaceAll("</script", "<\\/script")}</script></body></html>`;
	const server = http.createServer((_request, response) => {
		response.setHeader("content-type", "text/html");
		response.end(html);
	});
	await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	const page = await paged(`http://127.0.0.1:${port}/#${state}`, "chat composer", { size: [900, 900] });

	try {
		await waited(1500);
		return await page.ask(SEEN);
	} finally {
		page.close();
		server.close();
	}
}

const bundled = await bundleOf("tools/chat-composer-page.tsx");
check(
	"the empty chat draws a bare head, the welcome and the folder button; the model button names the model",
	await seenIn("empty", bundled),
	{
		header: 0,
		strip: 1,
		folder: 1,
		welcome: 1,
		bar: "",
		model: "Opus",
	},
);
check(
	"after the first message the header is back and the folder is fixed: no folder button",
	await seenIn("composer", bundled),
	{
		header: 1,
		strip: 1,
		folder: 0,
		welcome: 0,
		bar: "",
		model: "Opus",
	},
);
check("another provider has no Claude strip; the model button names the provider", await seenIn("codex", bundled), {
	header: 1,
	strip: 0,
	folder: 0,
	welcome: 0,
	bar: "",
	model: "Codex",
});
UNJUDGED.forEach((why) => console.log(`unjudged: ${why}`));
const report = await composerDiffReport();
report.differences.forEach((difference) =>
	console.log(
		`DIFF ${difference.at}: board ${JSON.stringify(difference.board)} built ${JSON.stringify(difference.built)}`,
	),
);
check("the composer and the empty chat match their boards in light and dark", report.differences.length, 0);
console.log(`chat composer: ${failed === 0 ? "clean" : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
