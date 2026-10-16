import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RuleTester } from "eslint";
import type { Rule } from "eslint";
import widgetarium, { parser } from "../packages/eslint-plugin/src/index.ts";
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

const WORKSPACE: Readonly<Record<string, string>> = {
	"package.json": JSON.stringify({ name: "fixture", workspaces: ["apps/*", "packages/*"] }),
	"packages/notes/package.json": JSON.stringify({ name: "@fixture/notes", widgetarium: { level: "domain" } }),
	"packages/notes/module.ts": CLIENT_MODULE,
	"packages/notes/features/search/contract.ts": "",
	"packages/notes/features/search/handlers.ts": "",
	"packages/notes/features/search/lib/rank.ts": "",
	"packages/notes/features/search/ui/search-box.tsx": "",
	"packages/notes/features/edit/rename/contract.ts": "",
	"packages/notes/features/edit/rename/handlers.ts": "",
	"packages/notes/features/lonely/contract.ts": "",
	"packages/notes/shared/schema/note.schema.ts": "",
	"packages/notes/shared/lib/clock.ts": "",
	"packages/notes/shared/ui/index.ts": "",
	"packages/notes/adapters/store/store.adapter.ts": "",
	"packages/notes/adapters/store/obsidian/obsidian.adapter.ts": "",
	"packages/notes/adapters/store/obsidian/paths.ts": "",
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
	"packages/host-web/package.json": JSON.stringify({ name: "@fixture/host-web" }),
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
		ok(`${REQUESTS}export const PagesQuery = query("notes/pages");`),
		ok(`${REQUESTS}export const PagesQueryHandler = handler(PagesQuery, NotesClientModule).handle(() => 1);`),
		ok(`${REQUESTS}export const OwnsNoteGuard = guard().handle(() => undefined);`),
		ok(`${REQUESTS}export const BillingServerModule = serverModule("billing").guard(PublicGuard);`),
		ok('import { query } from "./elsewhere.js";\nconst pages = query("x");'),
	],
	invalid: [
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
		ok('import { NotesClientModule } from "@fixture/notes/module";', "packages/host-web/src/start.ts"),
		ok('import { webNotesParts } from "@fixture/notes/adapters";', "packages/host-web/src/start.ts"),
		ok('import { BillingServerModule } from "@fixture/billing/module";', "apps/api/src/main.ts"),
		ok('import { ChargeCommand } from "@fixture/billing";', "packages/notes/features/search/handlers.ts"),
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
		bad(
			'import { clock } from "../../../notes/shared/lib/clock.js";',
			"acrossPackages",
			"packages/billing/features/charge/handlers.ts",
		),
	],
});

tested("module-definition", {
	valid: [ok(CLIENT_MODULE, "packages/notes/module.ts"), ok(SERVER_MODULE, "packages/billing/module.ts")],
	invalid: [
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
			'import { Store } from "../store/obsidian/obsidian.adapter.js";',
			"packages/notes/adapters/store/store.adapter.ts",
		),
		ok('import { paths } from "./paths.js";', "packages/notes/adapters/store/obsidian/obsidian.adapter.ts"),
		ok(CLIENT_MODULE, "packages/notes/module.ts"),
	],
	invalid: [
		bad("export const a = 1;", "misplaced", "packages/notes/features/search/helpers.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/search/util/split.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/search/ui/search-box.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/stray.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/shared/stuff.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/features/lonely/contract.ts"),
		bad("export const a = 1;", "misplaced", "packages/notes/adapters/store/helper.ts"),
		bad("export let count = 0;", "topLevelLet", "packages/notes/features/search/handlers.ts"),
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
			'import { paths } from "../../adapters/store/obsidian/paths.js";',
			"adapterPart",
			"packages/notes/shared/lib/clock.ts",
		),
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
	"the recommended config switches every rule on, ownership as a warning",
	Object.entries(configured).map(([id, severity]) => `${id} ${String(severity)}`),
	[
		"@widgetarium/building-block-names error",
		"@widgetarium/no-choice-strings error",
		"@widgetarium/contract-imports error",
		"@widgetarium/module-imports error",
		"@widgetarium/module-definition error",
		"@widgetarium/server-module error",
		"@widgetarium/feature-layout error",
		"@widgetarium/handler-ownership warn",
	],
);

process.chdir(repo);
fs.rmSync(scratch, { recursive: true, force: true });
console.log(tally.failed ? `eslint plugin: ${tally.failed} check(s) failed` : "eslint plugin: all checks passed");
process.exit(tally.failed ? 1 : 0);
