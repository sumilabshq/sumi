import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RuleTester } from "eslint";
import type { Rule } from "eslint";
import widgetarium, { parser } from "../packages/shared/eslint-plugin/src/index.ts";
import { check, tally } from "./check-helpers.ts";

interface Case {
	readonly code: string;
	readonly filename: string;
}

interface Invalid extends Case {
	readonly errors: readonly { readonly messageId: string }[];
}

interface Cases {
	readonly valid: readonly Case[];
	readonly invalid: readonly Invalid[];
}

const REQUESTS =
	'import { clientModule, command, guard, handler, middleware, query, serverModule } from "@widgetarium/core/requests";\n';
const SERVER_MODULE =
	'import { serverModule } from "@widgetarium/core/requests";\nexport const BillingServerModule = serverModule("billing");\n';
const CLIENT_MODULE =
	'import { clientModule } from "@widgetarium/core/requests";\nexport const NotesClientModule = clientModule("notes");\n';

const TALLY_MODULE =
	'import { Device, module } from "@widgetarium/core/requests";\nimport { CountQuery } from "./features/count/requests.js";\nexport const TallyModule = module("tally").on(Device).public(CountQuery);\n';
const COUNT_REQUESTS = "packages/tally/features/count/requests.ts";
const NEEDING_MODULE = [
	'import { Device, module, oneOf } from "@widgetarium/core/requests";',
	'import { AdapterHost, ProjectHost, Registry } from "./shared/host/canvas.host.js";',
	'export { AdapterHost, ProjectHost } from "./shared/host/canvas.host.js";',
	'export const CanvasModule = module("canvas").on(Device).needs(oneOf({ vault: { adapter: AdapterHost, registry: Registry }, project: { project: ProjectHost } }));',
	"",
].join("\n");
const PLACED_MODULE =
	'import { {on}, module } from "@widgetarium/core/requests";\nexport const PlacedModule = module("{name}").on({on});\n';

const WORKSPACE: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "fixture", workspaces: ["apps/*", "packages/*"] }),
	"packages/notes/package.json": JSON.stringify({ name: "@fixture/notes", widgetarium: { level: "domain" } }),
	"packages/notes/module.ts": CLIENT_MODULE,
	"packages/notes/features/search/contract.ts": "",
	"packages/notes/features/search/handlers.ts": "",
	"packages/notes/features/search/lib/rank.ts": 'import { split } from "../../../shared/lib/words.js";\n',
	"packages/notes/features/search/ui/search-box.tsx": "",
	"packages/notes/features/edit/rename/contract.ts": "",
	"packages/notes/features/edit/rename/handlers.ts": "",
	"packages/notes/features/lonely/contract.ts": "",
	"packages/notes/shared/schema/note.schema.ts": "",
	"packages/notes/shared/lib/clock.ts": "",
	"packages/notes/shared/ui/index.ts": "",
	"packages/notes/gateways/store/store.gateway.ts": "",
	"packages/notes/gateways/store/obsidian/obsidian.gateway.ts": "",
	"packages/notes/gateways/store/obsidian/paths.ts": "",
	"packages/notes/shared/lib/words.ts": "export const split = 1;\nexport const join = 2;\n",
	"packages/notes/shared/lib/uses-words.ts": 'import { join, split } from "./words.js";\n',
	"packages/billing/package.json": JSON.stringify({
		name: "@fixture/billing",
		exports: { ".": "./generated/index.ts", "./module": { server: "./generated/module.ts" } },
		widgetarium: { level: "domain" },
	}),
	"packages/billing/module.ts": SERVER_MODULE,
	"packages/billing/features/charge/contract.ts": "",
	"packages/billing/features/charge/handlers.ts": "",
	"packages/leaky/package.json": JSON.stringify({
		name: "@fixture/leaky",
		exports: { "./module": "./generated/module.ts" },
		widgetarium: { level: "domain" },
	}),
	"packages/leaky/module.ts": SERVER_MODULE,
	"packages/leaky/shared/ui/index.ts": "",
	"packages/tally/package.json": JSON.stringify({ name: "@fixture/tally", widgetarium: { level: "domain" } }),
	"packages/tally/module.ts": TALLY_MODULE,
	"packages/tally/features/count/requests.ts": 'import { cap } from "../../shared/lib/rules.js";\n',
	"packages/tally/features/mixed/requests.ts": "",
	"packages/tally/features/mixed/contract.ts": "",
	"packages/tally/shared/schema/count.schema.ts": "",
	"packages/tally/shared/lib/bounds.ts": "",
	"packages/tally/shared/lib/rules.ts": "export const cap = 1;\n",
	"packages/tally/shared/lib/index.ts": 'export { bounds } from "./bounds.js";\n',
	"packages/ledger/package.json": JSON.stringify({ name: "@fixture/ledger", widgetarium: { level: "domain" } }),
	"packages/ledger/module.ts": PLACED_MODULE.replaceAll("{name}", "ledger").replaceAll("{on}", "Server"),
	"packages/ledger/features/post/requests.ts": "",
	"packages/gauge/package.json": JSON.stringify({ name: "@fixture/gauge", widgetarium: { level: "domain" } }),
	"packages/gauge/module.ts": PLACED_MODULE.replaceAll("{name}", "gauge").replaceAll("{on}", "Device"),
	"packages/gauge/features/read/requests.ts": "",
	"apps/host-web/package.json": JSON.stringify({ name: "@fixture/host-web" }),
	"apps/web/package.json": JSON.stringify({ name: "@fixture/web" }),
	"apps/web/tsconfig.json": JSON.stringify({ compilerOptions: { customConditions: ["source"] } }),
	"apps/api/package.json": JSON.stringify({ name: "@fixture/api" }),
	"apps/api/tsconfig.json": JSON.stringify({ compilerOptions: { customConditions: ["source", "server"] } }),
};

const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "wg-eslint-plugin-")));
for (const [relative, text] of Object.entries(WORKSPACE)) {
	fs.mkdirSync(path.dirname(path.join(scratch, relative)), { recursive: true });
	fs.writeFileSync(path.join(scratch, relative), text);
}
const repo = process.cwd();
process.chdir(scratch);

const at = (relative: string): string => path.join(scratch, relative);
const ok = (code: string, relative = "packages/notes/shared/lib/clock.ts"): Case => ({ code, filename: at(relative) });
const bad = (code: string, messageId: string, relative = "packages/notes/shared/lib/clock.ts"): Invalid => ({
	code,
	filename: at(relative),
	errors: [{ messageId }],
});

RuleTester.describe = (_text: string, run: () => void): void => run();
RuleTester.it = (text: string, run: () => void): void => {
	try {
		run();
		check(text, "passes", "passes");
	} catch (failure) {
		check(text, failure instanceof Error ? failure.message.split("\n")[0] : String(failure), "passes");
	}
};
RuleTester.itOnly = RuleTester.it;
const tester = new RuleTester({ languageOptions: { parser } });

function tested(id: string, cases: Cases): void {
	const rule: Rule.RuleModule | undefined = Reflect.get(widgetarium.rules ?? {}, id);
	if (rule === undefined) return check(`the plugin carries ${id}`, false, true);
	tester.run(id, rule, {
		valid: [...cases.valid],
		invalid: cases.invalid.map((one) => ({ ...one, errors: [...one.errors] })),
	});
}

tested("building-block-names", {
	valid: [
		ok(TALLY_MODULE, "packages/tally/module.ts"),
		ok(
			'import { event, subscriber } from "@widgetarium/core/requests";\nexport const PanesChangedEvent = event("panes-changed");\nexport const PanesReReadSubscriber = subscriber(PanesChangedEvent).handle(() => undefined);',
		),
		ok(`${REQUESTS}export const PagesQuery = query("notes/pages");`),
		ok(`${REQUESTS}export const PagesQueryHandler = handler(PagesQuery, NotesClientModule).handle(() => 1);`),
		ok(`${REQUESTS}export const OwnsNoteGuard = guard().handle(() => undefined);`),
		ok(`${REQUESTS}export const BillingServerModule = serverModule("billing").guard(PublicGuard);`),
		ok('import { query } from "./elsewhere.js";\nconst pages = query("x");'),
	],
	invalid: [
		bad('import { module } from "@widgetarium/core/requests";\nexport const Tally = module("tally");', "wrongSuffix"),
		bad(
			'import { event } from "@widgetarium/core/requests";\nexport const PanesChanged = event("panes-changed");',
			"wrongSuffix",
		),
		bad(
			'import { event, subscriber } from "@widgetarium/core/requests";\nexport const PanesChangedEvent = event("panes-changed");\nexport const ReRead = subscriber(PanesChangedEvent).handle(() => undefined);',
			"wrongSuffix",
		),
		bad(`${REQUESTS}export const Pages = query("notes/pages");`, "wrongSuffix"),
		bad(`${REQUESTS}const PagesQuery = query("notes/pages");`, "unnamed"),
		bad(`${REQUESTS}export const listed = [query("notes/pages")];`, "unnamed"),
		bad(`${REQUESTS}export let PagesQuery = query("notes/pages");`, "unnamed"),
		bad(`${REQUESTS}export const pagesQuery = query("notes/pages");`, "notPascal"),
		bad(`${REQUESTS}export const PagesHandler = handler(PagesQuery, NotesClientModule);`, "wrongHandler"),
		bad(`${REQUESTS}export const PagesHandler = handler(Pages, NotesClientModule);`, "notRequest"),
		bad(`${REQUESTS}export const Billing = serverModule("billing");`, "wrongSuffix"),
		bad(`${REQUESTS}export const Canvas = clientModule("canvas");`, "wrongSuffix"),
		bad(`${REQUESTS}export const Timing = middleware().handle(async (_c, _d, next) => next());`, "wrongSuffix"),
		bad(
			'import { query as read } from "@widgetarium/core/requests";\nexport const Pages = read("notes/pages");',
			"wrongSuffix",
		),
	],
});

tested("no-choice-strings", {
	valid: [
		ok(TALLY_MODULE, "packages/tally/module.ts"),
		ok(`${REQUESTS}export const PagesQuery = query("notes/pages").cache({ freshFor: minutes(5) });`),
		ok(`${REQUESTS}export const H = handler(PagesQuery, M).handle(() => "a string is data here");`),
	],
	invalid: [
		bad(`${REQUESTS}export const AddCommand = command("notes/add").idempotencyKey("per-call");`, "choiceString"),
		bad(`${REQUESTS}export const PagesQuery = query("notes/pages").cache({ freshFor: "5m" });`, "choiceString"),
		bad(`${REQUESTS}export const NotesClientModule = clientModule("notes").provide("parts");`, "choiceString"),
	],
});

const SEARCH_CONTRACT = "packages/notes/features/search/contract.ts";
tested("contract-imports", {
	valid: [
		ok(
			'import { NoteSchema } from "../../shared/schema/note.schema.js";\nimport { query } from "@widgetarium/core/requests";\nimport { z } from "zod";',
			SEARCH_CONTRACT,
		),
		ok('import { rank } from "./lib/rank.js";', "packages/notes/features/search/handlers.ts"),
	],
	invalid: [
		bad('import { rank } from "./lib/rank.js";', "reachesIn", SEARCH_CONTRACT),
		bad('import { SearchQueryHandler } from "./handlers.js";', "reachesIn", SEARCH_CONTRACT),
		bad('import { clock } from "../../shared/lib/clock.js";', "reachesIn", SEARCH_CONTRACT),
		bad('import { NotesClientModule } from "../../module.js";', "reachesIn", SEARCH_CONTRACT),
		bad('import { BillingServerModule } from "@fixture/billing/module";', "wiring", SEARCH_CONTRACT),
	],
});

tested("module-imports", {
	valid: [
		ok('import { NotesClientModule } from "@fixture/notes/module";', "apps/web/src/main.ts"),
		ok('import { NotesClientModule } from "@fixture/notes/module";', "apps/host-web/src/start.ts"),
		ok('import { webNotesParts } from "@fixture/notes/gateways";', "apps/host-web/src/start.ts"),
		ok('import { BillingServerModule } from "@fixture/billing/module";', "apps/api/src/main.ts"),
		ok('import { ChargeCommand } from "@fixture/billing";', "packages/notes/features/search/handlers.ts"),
		ok('import { TallyModule } from "@fixture/tally/module";', "apps/web/src/main.ts"),
		ok('import { TallyModule } from "@fixture/tally/module";', "apps/api/src/main.ts"),
		ok('import { RecountCommand } from "@fixture/tally/server";', "packages/ledger/features/post/requests.ts"),
	],
	invalid: [
		bad('import { BillingServerModule } from "@fixture/billing/module";', "serverWiring", "apps/web/src/main.ts"),
		bad('import { NotesClientModule } from "@fixture/notes/module";', "clientWiring", "apps/api/src/main.ts"),
		bad(
			'import { BillingServerModule } from "@fixture/billing/module";',
			"serverWiring",
			"packages/notes/features/search/handlers.ts",
		),
		bad(
			'import { NotesClientModule } from "@fixture/notes/module";',
			"clientWiring",
			"packages/billing/features/charge/handlers.ts",
		),
		bad('import { charge } from "@fixture/billing/features/charge/handlers";', "noSuchEntry", "apps/api/src/main.ts"),
		bad('import { tallyParts } from "@fixture/tally/gateways";', "noSuchEntry", "apps/host-web/src/start.ts"),
		bad('import { TallyModule } from "@fixture/tally/module";', "appWiring", "packages/notes/shared/lib/clock.ts"),
		bad('import { RecountCommand } from "@fixture/tally/server";', "serverContract", "apps/web/src/main.ts"),
		bad(
			'import { RecountCommand } from "@fixture/tally/server";',
			"serverContract",
			"packages/gauge/features/read/requests.ts",
		),
		bad(
			'import { RecountCommand } from "@fixture/tally/server";',
			"serverContract",
			"packages/notes/features/search/handlers.ts",
		),
		bad(
			'import { clock } from "../../../notes/shared/lib/clock.js";',
			"acrossPackages",
			"packages/billing/features/charge/handlers.ts",
		),
	],
});

tested("module-definition", {
	valid: [
		ok(CLIENT_MODULE, "packages/notes/module.ts"),
		ok(SERVER_MODULE, "packages/billing/module.ts"),
		ok(TALLY_MODULE, "packages/tally/module.ts"),
		ok(NEEDING_MODULE, "packages/notes/module.ts"),
	],
	invalid: [
		bad(
			`${NEEDING_MODULE}export { StrayHost } from "./shared/host/canvas.host.js";`,
			"notTheModule",
			"packages/notes/module.ts",
		),
		bad(
			NEEDING_MODULE.replace("export { AdapterHost, ProjectHost }", "export { StrayHost as AdapterHost, ProjectHost }"),
			"notTheModule",
			"packages/notes/module.ts",
		),
		bad(
			NEEDING_MODULE.replace(
				'export { AdapterHost, ProjectHost } from "./shared/host/canvas.host.js";',
				"export { AdapterHost, ProjectHost };",
			),
			"notTheModule",
			"packages/notes/module.ts",
		),
		bad(`${CLIENT_MODULE}export function notesPartsOf() {}`, "notTheModule", "packages/notes/module.ts"),
		bad(`${CLIENT_MODULE}export { clock } from "./shared/lib/clock.js";`, "notTheModule", "packages/notes/module.ts"),
		bad(`${CLIENT_MODULE}export type Notes = string;`, "notTheModule", "packages/notes/module.ts"),
	],
});

tested("server-module", {
	valid: [ok(SERVER_MODULE, "packages/billing/module.ts"), ok(CLIENT_MODULE, "packages/notes/module.ts")],
	invalid: [
		{
			code: SERVER_MODULE,
			filename: at("packages/leaky/module.ts"),
			errors: [{ messageId: "ungated" }, { messageId: "serverUi" }],
		},
	],
});

tested("feature-layout", {
	valid: [
		ok(
			'import { query } from "@widgetarium/core/requests";\nexport const CountQuery = query("count").handle(() => 1);',
			COUNT_REQUESTS,
		),
		ok('export * from "./generated/contract.js";', "packages/tally/index.ts"),
		ok("export const SearchQuery = 1;", SEARCH_CONTRACT),
		ok(
			'import { query } from "@widgetarium/core/requests";\nexport const SearchQuery = query("notes/search");',
			SEARCH_CONTRACT,
		),
		ok("export const rank = 1;", "packages/notes/features/search/lib/rank.ts"),
		ok("export const SearchBox = 1;", "packages/notes/features/search/ui/search-box.tsx"),
		ok("export const RenameCommand = 1;", "packages/notes/features/edit/rename/contract.ts"),
		ok('import { clock } from "../../shared/lib/clock.js";', "packages/notes/features/search/handlers.ts"),
		ok(
			'import { Store } from "../store/obsidian/obsidian.gateway.js";',
			"packages/notes/gateways/store/store.gateway.ts",
		),
		ok('import { paths } from "./paths.js";', "packages/notes/gateways/store/obsidian/obsidian.gateway.ts"),
		ok(CLIENT_MODULE, "packages/notes/module.ts"),
		ok("export const ClockHost = 1;", "packages/tally/shared/host/clock.host.ts"),
	],
	invalid: [
		bad("export const ClockHost = 1;", "misplaced", "packages/tally/shared/host/clock.ts"),
		bad(
			'import { query } from "@widgetarium/core/requests";\nexport const CountQuery = query("counting").handle(() => 1);',
			"wrongShortName",
			COUNT_REQUESTS,
		),
		bad(
			'import { query } from "@widgetarium/core/requests";\nexport const CountQuery = query("tally/count").handle(() => 1);',
			"wrongShortName",
			COUNT_REQUESTS,
		),
		bad("export const a = 1;", "misplaced", "packages/tally/features/mixed/requests.ts"),
		bad("export const CountView = 1;", "misplaced", "packages/tally/features/count/ui/count-view.tsx"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/search/helpers.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/search/util/split.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/search/ui/search-box.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/stray.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/shared/stuff.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/lonely/contract.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/gateways/store/helper.ts"),
		bad(
			'import { handler } from "@widgetarium/core/requests";\nexport const SearchQueryHandler = handler(SearchQuery, M);',
			"handlerInContract",
			SEARCH_CONTRACT,
		),
		bad(
			'import { query } from "@widgetarium/core/requests";\nexport const SearchQuery = query("notes/find");',
			"wrongName",
			SEARCH_CONTRACT,
		),
		bad(
			'import { rank } from "../search/lib/rank.js";',
			"otherFeature",
			"packages/notes/features/edit/rename/handlers.ts",
		),
		bad(
			'import { SearchBox } from "../../search/ui/search-box.js";',
			"otherFeature",
			"packages/notes/features/edit/rename/handlers.ts",
		),
		bad(
			'import { paths } from "../../gateways/store/obsidian/paths.js";',
			"gatewayPart",
			"packages/notes/shared/lib/clock.ts",
		),
		bad(
			'import { SearchQuery } from "../../search/contract.js";',
			"otherFeature",
			"packages/notes/features/edit/rename/handlers.ts",
		),
		bad(
			'import { RenameCommand } from "../edit/rename/contract.js";',
			"otherFeature",
			"packages/notes/features/search/handlers.ts",
		),
	],
});

const NOTES_MODULE = "packages/notes/module.ts";
const SEARCH_HANDLERS = "packages/notes/features/search/handlers.ts";
const STORE_GATEWAY = "packages/notes/gateways/store/store.gateway.ts";
tested("layer-order", {
	valid: [
		ok('import { CountQuery } from "./features/count/requests.js";', "packages/tally/module.ts"),
		ok('import type { Note } from "../schema/note.schema.js";'),
		ok('import { clock } from "../../shared/lib/clock.js";', STORE_GATEWAY),
		ok('import { Store } from "../store/obsidian/obsidian.gateway.js";', STORE_GATEWAY),
		ok('import { Store } from "../../gateways/store/store.gateway.js";', SEARCH_HANDLERS),
		ok('import { rank } from "./lib/rank.js";', SEARCH_HANDLERS),
		ok('import { NotesClientModule } from "../../module.js";', SEARCH_HANDLERS),
		ok('import { clock } from "../../../shared/lib/clock.js";', "packages/notes/features/edit/rename/handlers.ts"),
		ok('import { Store } from "./gateways/store/obsidian/obsidian.gateway.js";', NOTES_MODULE),
		ok('import { clock } from "./shared/lib/clock.js";', NOTES_MODULE),
		ok('import { SearchQueryHandler } from "../features/search/handlers.js";', "packages/notes/generated/module.ts"),
		ok('import { anything } from "../../features/search/contract.js";', "apps/web/src/main.ts"),
	],
	invalid: [
		bad('import { count } from "./features/count/lib/count.js";', "upward", "packages/tally/module.ts"),
		bad('import { SearchQuery } from "../../features/search/contract.js";', "upward"),
		bad('import type { Store } from "../../gateways/store/store.gateway.js";', "upward"),
		bad('import { SearchQuery } from "../../features/search/contract.js";', "upward", STORE_GATEWAY),
		bad('import { NotesClientModule } from "../../module.js";', "upward", STORE_GATEWAY),
		bad(
			'import { NotesClientModule } from "../../../module.js";',
			"upward",
			"packages/notes/features/search/lib/rank.ts",
		),
		bad('import { rank } from "./features/search/lib/rank.js";', "upward", NOTES_MODULE),
	],
});

tested("module-state", {
	valid: [
		ok("export const LIMIT = 3;"),
		ok('const NAMES: readonly string[] = ["a"];'),
		ok("const SEEN: ReadonlySet<string> = new Set();"),
		ok("const BY_NAME: ReadonlyMap<string, number> = new Map();"),
		ok('const KINDS = ["a", "b"] as const;'),
		ok("export function counted() { let count = 0; count += 1; return count; }"),
		ok("let count = 0;", "apps/web/src/main.ts"),
		ok("let count = 0;", "packages/notes/generated/module.ts"),
	],
	invalid: [
		bad("let count = 0;", "topLevelLet"),
		bad("export let count = 0;", "topLevelLet", SEARCH_HANDLERS),
		bad("var count = 0;", "topLevelLet", STORE_GATEWAY),
		bad("let count = 0;", "topLevelLet", NOTES_MODULE),
		bad("const seen = new Set<string>();", "writableCollection"),
		bad("export const cache = new Map();", "writableCollection", "packages/notes/features/search/lib/rank.ts"),
		bad("const queue: (() => void)[] = [];", "writableCollection"),
		bad("const listed = new Array(3) satisfies number[];", "writableCollection"),
	],
});

tested("single-use-lib", {
	valid: [
		ok("export const split = 1;", "packages/notes/shared/lib/words.ts"),
		ok("export const unused = 1;", "packages/notes/shared/lib/words.ts"),
		ok("export const join = 1;", "packages/notes/shared/schema/note.schema.ts"),
		ok("export const bounds = 1;", "packages/tally/shared/lib/bounds.ts"),
		ok("export const cap = 1;", "packages/tally/shared/lib/rules.ts"),
	],
	invalid: [
		bad("export const split = 1;\nexport const join = 2;", "singleUse", "packages/notes/shared/lib/words.ts"),
		bad("export function join() {}", "singleUse", "packages/notes/shared/lib/words.ts"),
	],
});

const CHARGE_HANDLERS = "packages/billing/features/charge/handlers.ts";
tested("handler-ownership", {
	valid: [
		ok(
			"export const H = handler(ChargeCommand, M).guard(OwnsInvoiceGuard).handle(({ invoice }, { billingDb }) => billingDb.pay(invoice));",
			CHARGE_HANDLERS,
		),
		ok("export const run = () => SearchQueryHandler.handle({}, {});", "packages/notes/features/search/handlers.ts"),
	],
	invalid: [
		bad(
			"export const H = handler(ChargeCommand, M).guard(AuthenticatedGuard).handle(({ invoice }, { billingDb }) => billingDb.pay(invoice));",
			"unresolved",
			CHARGE_HANDLERS,
		),
		bad("export const run = () => RefundCommandHandler.handle({}, {});", "handlerCall", CHARGE_HANDLERS),
	],
});

const configured = widgetarium.configs.recommended[0]?.rules ?? {};
check(
	"the recommended config switches every rule on, ownership, layer order and single-use lib as warnings",
	Object.entries(configured).map(([id, severity]) => `${id} ${String(severity)}`),
	[
		"@widgetarium/building-block-names error",
		"@widgetarium/no-choice-strings error",
		"@widgetarium/contract-imports error",
		"@widgetarium/module-imports error",
		"@widgetarium/module-definition error",
		"@widgetarium/module-state error",
		"@widgetarium/server-module error",
		"@widgetarium/feature-layout error",
		"@widgetarium/layer-order warn",
		"@widgetarium/handler-ownership warn",
		"@widgetarium/single-use-lib warn",
	],
);

process.chdir(repo);
fs.rmSync(scratch, { recursive: true, force: true });
console.log(tally.failed ? `eslint plugin: ${tally.failed} check(s) failed` : "eslint plugin: all checks passed");
process.exit(tally.failed ? 1 : 0);
