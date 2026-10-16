import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf } from "./harness.ts";

const FramesSchema = z.union([
	z.object({ failure: z.string() }),
	z.object({ settledNow: z.array(z.number()), asynchronous: z.array(z.number()) }),
]);

const REPORT_WAITED_MS = 20000;
const POLL_MS = 100;

const work = mkdtempSync(path.join(tmpdir(), "wg-request-frames-"));
const file = path.join(work, "frames.html");
const bundle = await bundleOf("tools/requests-frames-page.ts");
writeFileSync(
	file,
	`<!doctype html><html><head><meta charset="utf-8"></head><body><script id="wg-measure" type="application/json"></script><script>${bundle}</script></body></html>`,
);
const page = await paged(file, "request frames", { size: [400, 300] });
const payload = await reportOf(page);
page.close();
const read = FramesSchema.safeParse(payload === "" ? null : JSON.parse(payload));
if (!read.success || "failure" in read.data) {
	console.error(
		`request frames: the page did not report — ${read.success && "failure" in read.data ? read.data.failure : payload}`,
	);
	process.exit(1);
}
const { settledNow, asynchronous } = read.data;
const failures = [
	Math.max(...settledNow) === 0 ? null : `a settlesNow query painted loading frames: ${settledNow.join(",")}`,
	Math.min(...asynchronous) >= 1
		? null
		: `an async query painted no loading frame, so the probe sees nothing: ${asynchronous.join(",")}`,
].filter((failure): failure is string => failure !== null);
console.log(`settlesNow loading frames: ${settledNow.join(",")}`);
console.log(`async loading frames:      ${asynchronous.join(",")}`);
for (const failure of failures) console.log(`!!  ${failure}`);
console.log(failures.length === 0 ? "request frames: clean" : `request frames: ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);

async function reportOf(page: AskedPage): Promise<string> {
	const until = Date.now() + REPORT_WAITED_MS;
	while (Date.now() < until) {
		const told = await page.ask('document.getElementById("wg-measure")?.textContent ?? ""');
		if (typeof told === "string" && told !== "") return told;
		await waited(POLL_MS);
	}
	return "";
}
