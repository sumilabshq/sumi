import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import path from "node:path";
import { runtime, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { BalanceQuery, ChargeCommand, FixtureBillingModule } from "@widgetarium/fixture-billing";
import { check } from "./check-helpers.ts";

const REPO = path.resolve(import.meta.dirname, "..");
const SERVER_APP = path.join(REPO, "apps/server");
const TSX = path.join(REPO, "node_modules/.bin/tsx");
const SERVER_ARGS = ["--conditions=source", "--conditions=server", "src/main.ts"];
const LISTENING = /listening on (http:\/\/localhost:\d+)/;
const STARTS_WITHIN_MS = 30_000;
const OBSIDIAN_ORIGIN = "app://obsidian.md";
const FOREIGN_ORIGIN = "https://elsewhere.example";
const REPEATED_KEY = "server-test-repeat";

function startServer(): { readonly child: ChildProcess; readonly url: Promise<string> } {
	const child = spawn(TSX, SERVER_ARGS, { cwd: SERVER_APP, env: { ...process.env, PORT: "0" } });
	return { child, url: listeningUrlOf(child) };
}

function listeningUrlOf(child: ChildProcess): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		let said = "";
		const timer = setTimeout(() => reject(new Error(`apps/server did not start: ${said}`)), STARTS_WITHIN_MS);
		const heard = (chunk: Buffer): void => {
			said += chunk.toString();
			const found = LISTENING.exec(said)?.[1];
			if (found === undefined) return;
			clearTimeout(timer);
			resolve(found);
		};
		child.stdout?.on("data", heard);
		child.stderr?.on("data", heard);
	});
}

async function allowedOriginFor(url: string, origin: string): Promise<string | null> {
	const preflight = await fetch(`${url}/rpc/fixture-billing/charge`, {
		method: "OPTIONS",
		headers: { origin, "access-control-request-method": "POST" },
	});
	return preflight.headers.get("access-control-allow-origin");
}

async function checkRequests(url: string): Promise<void> {
	const client = runtime()
		.imports(FixtureBillingModule({ over: orpcTransport(url) }))
		.start();
	const opened = await client.send(BalanceQuery);
	check("a query travels over real HTTP and answers", opened, {
		ok: true,
		output: { currency: "EUR", total: 0, charges: 0 },
	});
	const refused = await client.send(ChargeCommand, { amount: 5000 });
	check("a guard's refusal travels back with its code", refused.ok ? "ran" : [refused.code, refused.ran], [
		"forbidden",
		false,
	]);
	await checkRepeatedKey(client);
}

async function checkRepeatedKey(client: Runtime): Promise<void> {
	const first = await client.send(ChargeCommand, { amount: 10 }, { idempotencyKey: REPEATED_KEY });
	const repeat = await client.send(ChargeCommand, { amount: 10 }, { idempotencyKey: REPEATED_KEY });
	check("a repeat of one idempotency key gets the first answer, which ran", [first.ok, repeat], [true, first]);
	const after = await client.send(BalanceQuery);
	check("and the handler ran once", after.ok ? after.output.charges : after.reason, 1);
}

async function checkOrigins(url: string): Promise<void> {
	check("CORS lets Obsidian's origin call /rpc", await allowedOriginFor(url, OBSIDIAN_ORIGIN), OBSIDIAN_ORIGIN);
	check("and no other origin", await allowedOriginFor(url, FOREIGN_ORIGIN), null);
}

const started = startServer();
try {
	const url = await started.url;
	await checkRequests(url);
	await checkOrigins(url);
} finally {
	started.child.kill();
}
