import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import {
	PageColoursReadSchema,
	READ_PAGE_COLOURS,
} from "../packages/domain/browser/gateways/browser-pages/tauri/page-look-script.ts";
import { pageFillOf } from "../packages/domain/browser/shared/lib/page-fill.ts";

interface Sample {
	readonly name: string;
	readonly html: string;
	readonly fill: string;
}

const HERO =
	"data:image/svg+xml;base64," +
	Buffer.from(
		'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" fill="#e07a5f"/><circle cx="400" cy="150" r="120" fill="#3d405b"/></svg>',
	).toString("base64");

const SAMPLES: readonly Sample[] = [
	{
		name: "theme-color wins over the body",
		html: '<meta name="theme-color" content="#0b5"><body style="margin:0;background:#fff">Hi</body>',
		fill: "#00bb55",
	},
	{
		name: "a pink site paints the header pink",
		html: '<body style="margin:0;background:rgb(255, 79, 163)">Pink</body>',
		fill: "rgb(255, 79, 163)",
	},
	{
		name: "a coloured top bar paints the header its colour, as Slack's purple bar",
		html: '<body style="margin:0;background:#fff"><div style="height:60px;background:#4a154b;border-bottom:2px solid #0f172a"></div>Text</body>',
		fill: "rgb(74, 21, 75)",
	},
	{
		name: "a see-through top bar falls through to the page under it",
		html: '<body style="margin:0;background:#fafafa"><div style="height:60px;background:rgba(0,0,0,0.3)"></div>Text</body>',
		fill: "rgb(250, 250, 250)",
	},
	{
		name: "a gradient page paints the header its canvas colour",
		html: '<body style="margin:0;min-height:100vh;background:linear-gradient(90deg,#ff7a59,#1fb6ff)">G</body>',
		fill: "rgb(255, 255, 255)",
	},
	{
		name: "a picture at the top paints the header the page colour",
		html: `<body style="margin:0;background:#fff"><img src="${HERO}" style="display:block;width:100%;height:300px"></body>`,
		fill: "rgb(255, 255, 255)",
	},
	{
		name: "a page with no colour is the canvas",
		html: "<body style='margin:0'>Plain</body>",
		fill: "rgb(255, 255, 255)",
	},
	{
		name: "a dark-only page is the dark canvas",
		html: "<style>:root{color-scheme:dark}</style><body style='margin:0'>Dark</body>",
		fill: "rgb(18, 18, 18)",
	},
	{
		name: "the root colour counts when the body has none",
		html: "<style>html{background:#202124}</style><body style='margin:0'>Root</body>",
		fill: "rgb(32, 33, 36)",
	},
	{
		name: "a theme-color for dark mode only is ignored in light",
		html: '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111"><body style="margin:0;background:#fafafa">L</body>',
		fill: "rgb(250, 250, 250)",
	},
];

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-page-colours"));
mkdirSync(shotsAt, { recursive: true });
const frames = SAMPLES.map(
	(sample, at) =>
		`<iframe id="sample-${at}" style="width:800px;height:400px;border:0" srcdoc="${sample.html.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></iframe>`,
).join("");
const file = path.join(shotsAt, "page-colours.html");
writeFileSync(file, `<!doctype html><html><body>${frames}</body></html>`);

let failed = 0;
const page = await paged(file, "page-colours", { size: [900, 900] });
try {
	await waited(800);
	for (const [at, sample] of SAMPLES.entries()) {
		const said = await page.ask(
			`document.getElementById("sample-${at}").contentWindow.eval(${JSON.stringify(READ_PAGE_COLOURS)})`,
		);
		const colours = PageColoursReadSchema.parse(JSON.parse(String(said)));
		const fill = pageFillOf(colours);
		const isOk = fill === sample.fill;
		if (!isOk) failed += 1;
		console.log(`${isOk ? "ok  " : "FAIL"} ${sample.name} — fill ${fill}`);
	}
} finally {
	page.close();
}

if (failed > 0) {
	console.log(`${failed} sample(s) failed`);
	process.exit(1);
}
