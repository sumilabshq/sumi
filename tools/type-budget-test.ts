import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { check, tally } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const LAID = path.join(REPO, "node_modules/.cache/widgetarium/type-budget");
const BUDGET_FILE = path.join(REPO, "tools/type-budget.json");
const HANDLER_COUNT = 200;
const ALLOWED_GROWTH = 1.2;
const RECORD = process.argv.includes("--record");
const INSTANTIATIONS = /^Instantiations:\s+(\d+)/m;
const CHECK_TIME = /^Check time:\s+([\d.]+)s/m;
const FAILURE_SHOWN = 2000;
const SHARED_DECLARATIONS = ["packages/core/src/*.d.ts", "packages/kit/src/jsx-namespace.d.ts"];

const BudgetSchema = z.object({ handlers: z.number(), instantiations: z.number(), checkSeconds: z.number() });

type Budget = z.infer<typeof BudgetSchema>;

interface Cost {
	readonly instantiations: number;
	readonly checkSeconds: number;
}

const PREAMBLE = `import { z } from "zod";
import { AuthenticatedGuard, PerCall, command, guard, handler, middleware, serverModule } from "@widgetarium/core/requests";

export abstract class LedgerGateway {
	abstract add(amount: number): Promise<{ total: number }>;
}

class MemoryLedgerGateway extends LedgerGateway {
	override add(amount: number): Promise<{ total: number }> {
		return Promise.resolve({ total: amount });
	}
}

export const OwnsItemGuard = guard<{ readonly id: string }>().handle(({ input }) => ({ item: input.id }));

export const TimingMiddleware = middleware().handle(async (_call, _deps, next) => next());

export const BudgetServerModule = serverModule("budget")
	.use(TimingMiddleware)
	.provide(() => ({ ledgerGateway: new MemoryLedgerGateway() }));
`;

function handlerSource(at: number): string {
	return `
export const Item${at}Command = command("budget/item-${at}")
	.idempotencyKey(PerCall)
	.input(z.object({ id: z.string(), amount: z.number() }))
	.output(z.object({ total: z.number() }));

export const Item${at}CommandHandler = handler(Item${at}Command, BudgetServerModule)
	.guard(AuthenticatedGuard)
	.guard(OwnsItemGuard)
	.use(TimingMiddleware)
	.inject({ ledgerGateway: LedgerGateway })
	.handle(({ amount }, { ledgerGateway, user, item }) => ledgerGateway.add(amount + item.length + user.id.length));
`;
}

function moduleSource(count: number): string {
	const handlers = Array.from({ length: count }, (_unused, at) => `Item${at}CommandHandler`).join(", ");
	return `
export const JoinedBudgetServerModule = BudgetServerModule.handlers([${handlers}]);
`;
}

function layFixture(count: number): string {
	const source = `handlers-${count}.ts`;
	const handlers = Array.from({ length: count }, (_unused, at) => handlerSource(at)).join("");
	fs.writeFileSync(path.join(LAID, source), PREAMBLE + handlers + moduleSource(count));
	const config = {
		extends: path.relative(LAID, path.join(REPO, "packages/fixture-billing/tsconfig.json")),
		compilerOptions: { tsBuildInfoFile: null, noEmit: true, noUnusedLocals: false },
		references: [],
		include: [source, ...SHARED_DECLARATIONS.map((at) => path.relative(LAID, path.join(REPO, at)))],
	};
	const configPath = path.join(LAID, `tsconfig.${count}.json`);
	fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
	return configPath;
}

function measured(count: number): Cost | string {
	const ran = spawnSync("npx", ["--no-install", "tsc", "-p", layFixture(count), "--extendedDiagnostics"], {
		cwd: REPO,
		encoding: "utf8",
	});
	const said = `${ran.stdout}${ran.stderr}`;
	const instantiations = INSTANTIATIONS.exec(said)?.[1];
	const checkSeconds = CHECK_TIME.exec(said)?.[1];
	if (ran.status !== 0 || instantiations === undefined || checkSeconds === undefined) return said;
	return { instantiations: Number(instantiations), checkSeconds: Number(checkSeconds) };
}

function handlersCost(): Budget | string {
	fs.rmSync(LAID, { recursive: true, force: true });
	fs.mkdirSync(LAID, { recursive: true });
	fs.writeFileSync(path.join(LAID, "package.json"), JSON.stringify({ type: "module" }));
	const none = measured(0);
	const all = measured(HANDLER_COUNT);
	if (typeof none === "string") return none;
	if (typeof all === "string") return all;
	return {
		handlers: HANDLER_COUNT,
		instantiations: all.instantiations - none.instantiations,
		checkSeconds: Number((all.checkSeconds - none.checkSeconds).toFixed(3)),
	};
}

const now = handlersCost();
if (typeof now === "string") {
	check(`the ${HANDLER_COUNT}-handler fixture type-checks`, now.slice(0, FAILURE_SHOWN), "");
} else if (RECORD) {
	fs.writeFileSync(BUDGET_FILE, `${JSON.stringify(now, null, "\t")}\n`);
	console.log(`recorded ${JSON.stringify(now)}`);
} else {
	const budget = BudgetSchema.parse(JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8")));
	console.log(`     measured ${JSON.stringify(now)}, recorded ${JSON.stringify(budget)}`);
	check(
		`${HANDLER_COUNT} handlers cost at most ${ALLOWED_GROWTH}x the recorded instantiations`,
		now.instantiations <= budget.instantiations * ALLOWED_GROWTH,
		true,
	);
}

console.log(tally.failed ? `type budget: ${tally.failed} check(s) failed` : "type budget: within budget");
process.exit(tally.failed ? 1 : 0);
