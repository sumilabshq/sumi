import { check, tally } from "./check-helpers.ts";
import { fontSizeRefusalsOf, scaleTokenRefusalsOf, typeScaleRefusals } from "./type-scale.ts";

check("a scale token passes", fontSizeRefusalsOf("a.css", ".a { font-size: var(--fs-13); }"), []);
check(
	"inherit and the code size pass",
	fontSizeRefusalsOf("a.css", ".a { font: inherit; font-size: var(--code-size); }"),
	[],
);
check("a raw px size is refused", fontSizeRefusalsOf("a.css", ".a {\n\tfont-size: 12px;\n}"), [
	"a.css:2 font-size: 12px is not a scale token",
]);
check("a fallback literal is refused", fontSizeRefusalsOf("a.css", ".a { font-size: var(--fs-12, 12px); }"), [
	"a.css:1 font-size: var(--fs-12, 12px) is not a scale token",
]);
check("an off-scale token is refused", fontSizeRefusalsOf("a.css", ".a { font-size: var(--fs-15); }"), [
	"a.css:1 font-size: var(--fs-15) is not a scale token",
]);
check("a host size is refused", fontSizeRefusalsOf("a.css", ".a { font-size: var(--font-ui-small, 14px); }"), [
	"a.css:1 font-size: var(--font-ui-small, 14px) is not a scale token",
]);
check(
	"a shorthand with a scale token passes",
	fontSizeRefusalsOf("a.css", ".a { font: var(--fw-ui) var(--fs-13) / 1.4 var(--font-ui); }"),
	[],
);
check(
	"a shorthand with a raw size is refused",
	fontSizeRefusalsOf("a.css", ".a { font: 500 13px var(--font-sans); }"),
	["a.css:1 font-size: 13px is not a scale token"],
);
check("a sheet string is read too", fontSizeRefusalsOf("a.ts", "const S = `.a { font-size: 15px; }`;"), [
	"a.ts:1 font-size: 15px is not a scale token",
]);
check(
	"the canvas zoom label is an allowed exception",
	fontSizeRefusalsOf("canvas-page.css", ".a { font-size: calc(12px / var(--canvas-zoom, 1)); }"),
	[],
);
check("a token equal to its name passes", scaleTokenRefusalsOf("t.css", "\t--fs-13: 13px;\n"), []);
check("a token off its name is refused", scaleTokenRefusalsOf("t.css", "\t--fs-13: 12.5px;\n"), [
	"t.css:1 --fs-13: 12.5px is not a scale token whose value equals its name",
]);
check("a token outside the scale is refused", scaleTokenRefusalsOf("t.css", "\t--fs-15: 15px;\n"), [
	"t.css:1 --fs-15: 15px is not a scale token whose value equals its name",
]);
check("a family value off the scale is refused", scaleTokenRefusalsOf("t.css", "\t--type-l: 15px;\n"), [
	"t.css:1 --type-l: 15px resolves outside the scale",
]);
check("a family value on the scale passes", scaleTokenRefusalsOf("t.css", "\t--type-l: 16px;\n"), []);

const refusals = typeScaleRefusals();

for (const refusal of refusals) {
	console.log(refusal);
}

console.log(
	`\ntype scale: ${refusals.length} refusals in ${new Set(refusals.map((refusal) => refusal.split(":")[0])).size} files`,
);
check("every font size and scale token is on the scale", refusals.length, 0);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("type scale: all checks passed");
