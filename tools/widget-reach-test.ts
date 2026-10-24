import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { reachFindingsIn, reachFindingsOfFolder, reachRefusal } =
	await import("../packages/shared/core/src/engine/widget-reach/reach-scan.js");
const { compileCheckedWidget, compileWidgetFolder, modulesIn, LIB_FILES } =
	await import("../packages/shared/core/src/engine/widget-build.js");
const { buildRecord, buildMatchesSources } = await import("../packages/shared/core/src/engine/widget-lock.js");
const { installWidget } = await import("../apps/host-obsidian/src/legacy/ai/install-command.js");
const { cardFrom } = await import("../apps/host-obsidian/src/legacy/ai/widget-entry.js");

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) {
		failed += 1;
	}

	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

const refusedTokens = (source: string): string[] =>
	reachFindingsIn(source, "widget.tsx")
		.filter((one) => one.isRefused)
		.map((one) => one.token);

const warnedTokens = (source: string): string[] =>
	reachFindingsIn(source, "widget.tsx")
		.filter((one) => !one.isRefused)
		.map((one) => one.token);

console.log("— every token is refused where it is read —");
const REFUSED: readonly (readonly [string, string, readonly string[]])[] = [
	["the window", 'window.addEventListener("keydown", go);', ["window"]],
	["globalThis", "globalThis.fetch(url);", ["globalThis"]],
	[
		"self, top, parent and frames, unbound",
		"self.a; top.b; parent.c; frames.d; opener.e;",
		["self", "top", "parent", "frames", "opener"],
	],
	["Node's global", "global.x;", ["global"]],
	["the document", "const at = document.body;", ["document"]],
	["Obsidian's active window and document", "activeWindow.x; activeDocument.y;", ["activeWindow", "activeDocument"]],
	["Obsidian's app", "app.vault.adapter.read(p);", ["app"]],
	["an element's own document", "ref.current.ownerDocument.body;", [".ownerDocument"]],
	["a document's window", "node.ownerDocument.defaultView.x;", [".defaultView", ".ownerDocument"]],
	["a root node", "el.getRootNode().querySelector(q);", [".getRootNode"]],
	["a frame's window", "frame.contentWindow.x; frame.contentDocument.y;", [".contentWindow", ".contentDocument"]],
	[
		"storage",
		'localStorage.setItem("k", v); sessionStorage.clear(); indexedDB.open("d");',
		["localStorage", "sessionStorage", "indexedDB"],
	],
	["storage reached as a property", "view.localStorage.x;", [".localStorage"]],
	["Node's process and require", 'process.env.HOME; require("fs");', ["process", "require"]],
	["eval", 'eval("1");', ["eval"]],
	["an indirect eval", '(0, eval)("1");', ["eval"]],
	["the Function constructor", 'new Function("return this")();', ["Function"]],
	["a dynamic import", 'const m = await import("https://x.example/m.js");', ["import()"]],
	["a property built from strings", 'host["win" + "dow"];', [".window"]],
	["globalThis reached by a built name", 'globalThis["win" + "dow"];', [".window", "globalThis"]],
	["the constructor through this", 'this.constructor.constructor("return this")();', [".constructor", ".constructor"]],
	["the constructor by a literal key", 'f["constructor"]("x");', [".constructor"]],
	["the constructor by a template", 'f[`con${"struc"}tor`];', [".constructor"]],
	["the constructor by a joined array", 'f[["con", "structor"].join("")];', [".constructor"]],
	[
		"the constructor by char codes",
		"f[String.fromCharCode(99, 111, 110, 115, 116, 114, 117, 99, 116, 111, 114)];",
		[".constructor"],
	],
	["the constructor through optional chaining", "f?.constructor;", [".constructor"]],
	["the constructor handed to Reflect", 'Reflect.get(f, "constructor");', ['"constructor"']],
	["the prototype chain", "f.__proto__;", [".__proto__"]],
	["a destructured climb", "const { ownerDocument } = el;", [".ownerDocument"]],
	["a destructured constructor under a built key", 'const { ["const" + "ructor"]: make } = f;', [".constructor"]],
	["a timer given text", 'setTimeout("alert(1)", 0);', ["setTimeout(text)"]],
	["a timer given text it builds", 'setInterval("go(" + n + ")", 10);', ["setInterval(text)"]],
	["a timer given a template", "setTimeout(`go(${n})`);", ["setTimeout(text)"]],
	["the window in JSX", "const a = <window.Thing />;", ["window"]],
	["a webview found by tag", 'el.querySelector("webview");', ['"webview"']],
	["a webview found by the browser mark", 'el.querySelector("[data-browser-page]");', ['"[data-browser-page]"']],
	[
		"a webview driven",
		"page.executeJavaScript(code); page.capturePage(); page.loadURL(u); page.webContents;",
		[".executeJavaScript", ".capturePage", ".loadURL", ".webContents"],
	],
	["a name declared in another block", "{\n\tlet parent = 1;\n}\nparent.x;", ["parent"]],
	["a source that cannot be read", "const = ;", ["source"]],
	[
		"a declared binding, which the compiler strips",
		"declare const window: any;\nwindow.alert(1);",
		["window", "window"],
	],
	["a type-only import", 'import type { document } from "x";\ndocument.body;', ["document", "document"]],
	["a declared global block", "declare global {\n\tvar document: any;\n}\ndocument.body;", ["global", "document"]],
	["a switch head beside a case binding", "switch (window.x) {\n\tdefault:\n\t\tconst window = 2;\n}", ["window"]],
	["a default parameter beside a body var", "function f(a = window.x) {\n\tvar window;\n}", ["window"]],
	["a computed method key beside its parameter", "({ [window.name](window) {} });", ["window"]],
	["a var inside a static block", "class A {\n\tstatic {\n\t\tvar window = 1;\n\t}\n}\nwindow.alert(1);", ["window"]],
	["a key passed through satisfies", 'el["ownerDocument" satisfies string];', [".ownerDocument"]],
	["an event's path to the window", "event.composedPath();", [".composedPath"]],
];
for (const [name, source, tokens] of REFUSED) {
	check(name, refusedTokens(source), tokens);
}

console.log("\n— and nothing that only looks like one —");
const CLEAN: readonly (readonly [string, string])[] = [
	["a local named parent", "const parent = node.parent;\nparent.children.map(go);"],
	["a var hoisted out of a block", "function up(x) {\n\tif (x) {\n\t\tvar parent = 1;\n\t}\n\treturn parent;\n}"],
	["a parameter named window", "const f = (window) => window.width;"],
	["a catch parameter named self", "try {\n\tgo();\n} catch (self) {\n\tsay(self);\n}"],
	["an imported name", 'import { top } from "./edges";\ntop(1);'],
	["a box's top and a node's parent", "box.top + node.parent.left;"],
	["an object key", 'const shape = { window: 1, document: "x", constructor: 2 };'],
	["a class constructor", "class Drag {\n\tconstructor() {\n\t\tthis.at = 0;\n\t}\n}"],
	[
		"words in strings and markup",
		'const words = ["document", "window"];\nconst a = <p>window</p>;\nconst css = `align-self: start;`;',
	],
	[
		"a type naming the window",
		"type Host = typeof window;\nlet held: Window | null = null;\ninterface Doc {\n\tdocument: Document;\n}",
	],
	["a timer given a function", "setTimeout(() => go(), 10);\nsetInterval(go, 10);"],
	["a static import", 'import { useState } from "react";'],
	["a shorthand property of a local", "const top = 1;\nconst at = { top };"],
	["a querySelector for a class", 'el.querySelector(".otd-tag");'],
	["a private field named window", "class A {\n\t#window = 1;\n\tread() {\n\t\treturn this.#window;\n\t}\n}"],
	["words handed to an ordinary call", 'say("app");\nsetTab("window");\nlabel("Open the webview settings");'],
	["ports named app and document", "const draw = ({ app, document }) => app.title + document.title;\nspec.app;"],
	["enum members named top and parent", "enum Side {\n\ttop = 1,\n\tparent = 2,\n}"],
];
for (const [name, source] of CLEAN) {
	check(name, refusedTokens(source), []);
}

console.log("\n— minified or obfuscated source is warned about, not refused —");
check("a very long line", warnedTokens(`const a = "${"x".repeat(2100)}";`), ["a line of 2000+ characters"]);
check("hex-named identifiers", warnedTokens("const _0x1f2a = 1;\nconst _0x1f2b = _0x1f2a;"), ["_0x1f2a"]);
check("neither is refused", refusedTokens(`const _0xabcd = "${"x".repeat(2100)}";`), []);

console.log("\n— a finding names its file and line —");
const found = reachFindingsIn("const a = 1;\n\nwindow.x;", "drag.ts")[0];
check(
	"the file, the line and the token",
	[found?.file, found?.line, found?.token, found?.rule],
	["drag.ts", 3, "window", "global"],
);
check(
	"the refusal says what to use instead",
	reachRefusal(reachFindingsIn("window.x;", "widget.tsx"), "@x/drag")?.includes("listenToWindow from widgetarium/kit"),
	true,
);
check("a clean folder is not refused", reachRefusal(reachFindingsIn("const a = 1;", "widget.tsx"), "@x/ok"), null);

console.log("\n— the build refuses it, sources only —");
const CLEAN_WIDGET = "export default 1;";
const refusalOf = (run: () => unknown): string => {
	try {
		run();
		return "";
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
};
check(
	"a folder whose module reaches the window does not compile",
	refusalOf(() => compileWidgetFolder({ "widget.tsx": CLEAN_WIDGET, "drag.ts": "window.x;" }, "@x/drag")).split("\n"),
	[
		"@x/drag reaches past its ports, so it is not run:",
		"drag.ts:1 window reaches the window, and through it every plugin and every guard the browser keeps; use listenToWindow from widgetarium/kit for pointer and key events, plain setTimeout for timers",
	],
);
check(
	"a build beside the sources is never read",
	refusalOf(() => compileWidgetFolder({ "widget.tsx": CLEAN_WIDGET, "build/widget.js": 'require("fs");' }, "@x/ok")),
	"",
);
check(
	"a scope lib is refused the same way",
	refusalOf(() => compileCheckedWidget("export const at = () => document.body;", "@x/lib.ts")).startsWith(
		"@x/lib.ts reaches past its ports",
	),
	true,
);

console.log("\n— a build made before the scan is not trusted —");
const SOURCES = { "widget.tsx": CLEAN_WIDGET };
const inputs = { "@x/ok/widget.tsx": CLEAN_WIDGET };
check(
	"a build recorded now matches",
	buildMatchesSources(buildRecord({ from: "widget.tsx", inputs }), "@x/ok", SOURCES),
	true,
);
check(
	"a build recorded before the scan does not",
	buildMatchesSources({ ...buildRecord({ from: "widget.tsx", inputs }), reachScan: null }, "@x/ok", SOURCES),
	false,
);

console.log("\n— install refuses it before writing anything —");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "widget-reach-"));
const offered = path.join(temp, "offered", "@evil", "reach");
fs.mkdirSync(offered, { recursive: true });
fs.writeFileSync(path.join(offered, "widget.tsx"), 'import { go } from "./go";\nexport default go;');
fs.writeFileSync(path.join(offered, "go.ts"), "export const go = () => localStorage.clear();");
const widgetsDir = path.join(temp, "vault", "widgets");
const installed = await installWidget(cardFrom({ api: 1 }, "@evil/reach", { installed: false, folder: offered }), {
	widgetsDir,
	lockPath: path.join(temp, "vault", "lock.json"),
});
check(
	"the install fails naming the module and the token",
	installed.failure
		?.split("\n")
		.slice(1, 2)
		.map((line) => line.split(" ").slice(0, 2).join(" ")),
	["go.ts:1 localStorage"],
);
check("and nothing was written", fs.existsSync(widgetsDir), false);
fs.rmSync(temp, { recursive: true, force: true });

console.log("\n— every widget the registry ships scans clean —");
const registryFindings = registryFolders().flatMap((folder) => {
	const files = textsUnder(folder);
	return reachFindingsOfFolder(files, modulesIn(files)).map((one) => `${folder}/${one.file}:${one.line} ${one.token}`);
});
check("no registry widget reaches past its ports", registryFindings, []);
const libFindings = scopeFolders().flatMap((scope) =>
	LIB_FILES.filter((name) => fs.existsSync(path.join(scope, name))).flatMap((name) =>
		reachFindingsIn(fs.readFileSync(path.join(scope, name), "utf8"), `${scope}/${name}`).map((one) => one.token),
	),
);
check("nor does any scope lib", libFindings, []);
check("and the registry was really read", registryFolders().length > 50, true);

function scopeFolders(): string[] {
	return fs
		.readdirSync("registry", { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name.startsWith("@"))
		.map((entry) => path.join("registry", entry.name));
}

function registryFolders(): string[] {
	return scopeFolders().flatMap((scope) =>
		fs
			.readdirSync(scope, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => path.join(scope, entry.name)),
	);
}

function textsUnder(folder: string, under = ""): Record<string, string> {
	const texts: Record<string, string> = {};
	for (const entry of fs.readdirSync(path.join(folder, under), { withFileTypes: true })) {
		const name = under === "" ? entry.name : `${under}/${entry.name}`;
		if (entry.isDirectory()) {
			Object.assign(texts, textsUnder(folder, name));
			continue;
		}

		if (/\.tsx?$/.test(entry.name)) {
			texts[name] = fs.readFileSync(path.join(folder, name), "utf8");
		}
	}

	return texts;
}

console.log(`\n${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
