import { check, tally } from "./check-helpers.ts";
import { KIT_STYLE_ROOTS, kitClassesOf, kitStyleRefusalsOf, kitStyleRefusalsUnder } from "./kit-styles.ts";

check(
	"a sheet that reads kit tokens only passes",
	kitStyleRefusalsOf("a.css", ".row { border-radius: var(--item); }"),
	[],
);
check("inherit radius passes", kitStyleRefusalsOf("a.css", ".row { border-radius: inherit; }"), []);
check(
	"a mask gradient may use #000",
	kitStyleRefusalsOf("a.css", ".row { mask-image: linear-gradient(#000000, transparent); }"),
	[],
);
check(
	"a kit component used as a component passes",
	kitStyleRefusalsOf("a.tsx", '<Button shape="square" label="x" />'),
	[],
);
check("a kit selector is refused", kitStyleRefusalsOf("a.css", ".strip .wg-kit-icon { color: inherit; }"), [
	"a.css:1 kit-selector: restyles a kit component from outside the kit; give the kit the state or variant",
]);
check("a zero radius is refused", kitStyleRefusalsOf("a.css", ".row {\n\tborder-radius: 0;\n}"), [
	"a.css:2 radius-literal: border-radius: 0; only kit radius tokens",
]);
check(
	"a theme radius is refused as a radius",
	kitStyleRefusalsOf("a.css", ".row { border-top-left-radius: var(--r-sm); }"),
	["a.css:1 radius-literal: border-top-left-radius: var(--r-sm); only kit radius tokens"],
);
check(
	"a theme radius carried in a variable is refused",
	kitStyleRefusalsOf("a.css", ":root { --corner: var(--r-md); }"),
	["a.css:1 sumi-radius: --corner: var(--r-md); --r-* is a theme primitive, read a kit radius token"],
);
check("a state colour is refused", kitStyleRefusalsOf("a.css", ".row { background: var(--hover); }"), [
	"a.css:1 state-token: background: var(--hover); hover, active, selected and glyph colours are the kit's states",
]);
check("a colour literal is refused", kitStyleRefusalsOf("a.css", ".row { color: rgba(0, 0, 0, 0.5); }"), [
	"a.css:1 color-literal: color: rgba(0, 0, 0, 0.5); read a colour token",
]);
check(
	"a raw button is refused",
	kitStyleRefusalsOf("a.tsx", "const a = 1;\nreturn <button onClick={go}>Go</button>;"),
	["a.tsx:2 raw-element: <button> outside the kit; use the kit component"],
);

const STRIP_TSX = [
	'import { Button } from "@widgetarium/kit";',
	'const ICON = "strip-icon is-new";',
	'export const A = () => <Button shape="square" className={cn(ICON, `tile-${place}`)} />;',
].join("\n");
const KIT_CLASSES = new Set(kitClassesOf(STRIP_TSX));

check("classes handed to a kit component are collected, modifiers left out", [...KIT_CLASSES], ["strip-icon"]);
check(
	"a plain element's class is not a kit class",
	kitClassesOf('export const A = () => <div className="strip" />;'),
	[],
);
check(
	"painting a kit component through its own class is refused",
	kitStyleRefusalsOf("a.css", ".strip .strip-icon { background: none; }", KIT_CLASSES),
	[
		"a.css:1 kit-restyle: .strip-icon is a class on a kit component and this rule paints it; give the kit the state or variant",
	],
);
check(
	"drawing into a kit component's ::before is refused",
	kitStyleRefusalsOf("a.css", ".strip-icon::before { content: none; }", KIT_CLASSES),
	[
		"a.css:1 kit-restyle: .strip-icon is a class on a kit component and this rule paints it; give the kit the state or variant",
	],
);
check(
	"placing a kit component through its own class passes",
	kitStyleRefusalsOf("a.css", ".strip-icon { margin-left: auto; }", KIT_CLASSES),
	[],
);
check(
	"a kit class as the context of another element passes",
	kitStyleRefusalsOf("a.css", ".strip-icon .label { color: inherit; }", KIT_CLASSES),
	[],
);
check(
	"a custom element painting its own hover is refused",
	kitStyleRefusalsOf("a.css", ".row:hover { background: var(--control-fill-hover); }"),
	["a.css:1 custom-state: .row:hover paints a state (background); states are drawn by kit components"],
);
check(
	"a selected row painted through a variable is refused",
	kitStyleRefusalsOf("a.css", '.row[aria-current="true"] { --row-fill: var(--control-fill-open); }'),
	[
		'a.css:1 custom-state: .row[aria-current="true"] paints a state (--row-fill); states are drawn by kit components',
		"a.css:1 local-variable: --row-fill is declared off :root; custom properties are global, declared on :root",
	],
);
check("revealing tools on hover passes", kitStyleRefusalsOf("a.css", ".row:hover .tools { opacity: 1; }"), []);
check(
	"a spacing variable on a kit component is refused as local, never as paint",
	kitStyleRefusalsOf("a.css", ".strip-icon { --end-room: var(--space-3); }", KIT_CLASSES),
	["a.css:1 local-variable: --end-room is declared off :root; custom properties are global, declared on :root"],
);
check(
	"a colour variable on a kit component is refused",
	kitStyleRefusalsOf("a.css", ".strip-icon { --tint: var(--text-3); }", KIT_CLASSES),
	[
		"a.css:1 kit-restyle: .strip-icon is a class on a kit component and this rule paints it; give the kit the state or variant",
		"a.css:1 local-variable: --tint is declared off :root; custom properties are global, declared on :root",
	],
);
check(
	"an icon's class is ink, not a kit control",
	kitClassesOf('import { Icon } from "@widgetarium/kit";\nexport const A = () => <Icon className="chevron" />;'),
	[],
);

check(
	"kit radius utilities pass",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:rounded-control cv:md:rounded-plate cv:p-2";'),
	[],
);
check("a pixel-scale radius utility is refused", kitStyleRefusalsOf("a.ts", 'const A = "cv:rounded-md";'), [
	"a.ts:1 utility-radius: cv:rounded-md; only rounded-control, rounded-item, rounded-plate or rounded-pill",
]);
check("a hover paint utility is refused", kitStyleRefusalsOf("a.tsx", 'const A = "cv:p-2 cv:hover:bg-fill-hover";'), [
	"a.tsx:1 utility-state: cv:hover:bg-fill-hover paints a state; states are drawn by kit components",
]);
check(
	"a state utility that does not paint passes",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:disabled:opacity-50 cv:hover:duration-0";'),
	[],
);
check("an arbitrary colour utility is refused", kitStyleRefusalsOf("a.ts", 'const A = "cv:bg-[#fff]";'), [
	"a.ts:1 color-literal: cv:bg-[#fff]; read a colour token",
]);

check(
	"a paint utility on a kit component is refused",
	kitStyleRefusalsOf(
		"a.tsx",
		'import { Button } from "@widgetarium/kit";\nconst A = () => <Button className="cv:flex-1 cv:text-sm cv:bg-primary" />;',
	),
	["a.tsx:2 kit-restyle: cv:bg-primary paints a kit component; give the kit the state or variant"],
);

check(
	"a picked row painted through a data variant is refused",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:data-[picked]:bg-group";'),
	["a.ts:1 utility-state: cv:data-[picked]:bg-group paints a state; states are drawn by kit components"],
);
check(
	"a utility reaching into kit internals is refused",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:[&_.wg-kit-seg-thumb]:inset-y-1";'),
	[
		"a.ts:1 kit-selector: cv:[&_.wg-kit-seg-thumb]:inset-y-1 restyles a kit component from outside the kit; give the kit the state or variant",
	],
);
check(
	"a text size is not paint",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:hover:text-sm cv:text-[length:var(--fs-13)]";'),
	[],
);

check(
	"the kit portal layer as a scope passes",
	kitStyleRefusalsOf("a.css", ".wg-kit-portal-layer.is-studio .menu { color: inherit; }"),
	[],
);
check(
	"a kit class under the portal layer is refused",
	kitStyleRefusalsOf("a.css", ".wg-kit-portal-layer .wg-kit-pop { color: inherit; }"),
	["a.css:1 kit-selector: restyles a kit component from outside the kit; give the kit the state or variant"],
);

check(
	"relative colour from a token passes",
	kitStyleRefusalsOf("a.css", ":root { --lift: oklch(from var(--fill) l c h); }"),
	[],
);

check(
	"an explicit none radius passes",
	kitStyleRefusalsOf("a.css", ".row { border-start-start-radius: var(--radius-none); }"),
	[],
);
check("a zero corner is refused", kitStyleRefusalsOf("a.css", ".row { border-start-start-radius: 0; }").length, 1);
check(
	"spacing from variables passes",
	kitStyleRefusalsOf(
		"a.css",
		".row { padding: var(--space-1) var(--space-none); margin: 0 auto; gap: calc(-1 * var(--space-0-5)); }",
	).length,
	1,
);
check("spacing in pixels is refused", kitStyleRefusalsOf("a.css", ".row { padding: 12px; }"), [
	"a.css:1 spacing-literal: padding: 12px; spacing comes from a :root variable, var(--space-none) for none",
]);
check("a literal fallback is refused", kitStyleRefusalsOf("a.css", ".row { gap: var(--space-2, 8px); }").length, 1);
check("a named colour is refused", kitStyleRefusalsOf("a.css", ".row { color: white; }").length, 1);
check(
	"a variable declared on a component is refused",
	kitStyleRefusalsOf("a.css", ".row { --row-gap: var(--space-1); }"),
	["a.css:1 local-variable: --row-gap is declared off :root; custom properties are global, declared on :root"],
);
check("a variable declared on :root passes", kitStyleRefusalsOf("a.css", ":root { --row-gap: var(--space-1); }"), []);
check(
	"a scale spacing utility passes",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:p-2 cv:gap-[var(--space-0-5)] cv:rounded-none";'),
	[],
);
check(
	"an arbitrary pixel spacing utility is refused",
	kitStyleRefusalsOf("a.ts", 'const A = "cv:ps-[19px]";').length,
	1,
);

const refusals = kitStyleRefusalsUnder(KIT_STYLE_ROOTS);
const byRule = new Map<string, number>();

for (const refusal of refusals) {
	const rule = / ([a-z-]+): /.exec(refusal)?.[1] ?? "unknown";
	byRule.set(rule, (byRule.get(rule) ?? 0) + 1);
}

for (const refusal of refusals) {
	console.log(refusal);
}

console.log(
	`\nkit styles: ${refusals.length} refusals in ${new Set(refusals.map((refusal) => refusal.split(":")[0])).size} files`,
);

for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${rule}: ${count}`);
}

check("every app and plugin styles through the kit", refusals.length, 0);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("kit styles: all checks passed");
