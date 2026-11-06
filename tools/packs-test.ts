import type { ImplementationPorts, NetworkAsk } from "../packages/shared/core/src/engine/packs.ts";
import {
	definePack,
	registeredCommands,
	registeredQueries,
	shutPortsOf,
} from "../packages/shared/core/src/engine/packs.ts";
import { sourcesFor } from "../packages/shared/core/src/engine/host-gateways.ts";
import { FetchRowsQuery, FetchSendCommand, FetchValueQuery } from "../packages/shared/packs/core/src/index.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

async function refusalOf(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
		return "not refused";
	} catch (failure: unknown) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

const asked: [string, NetworkAsk][] = [];
const portsOf = (answer: string, status = 200): ImplementationPorts => ({
	...shutPortsOf("t1/probe"),
	network: {
		can: true,
		request: async (url, ask) => {
			asked.push([url, ask]);
			return { status, text: answer };
		},
	},
});

const json = JSON.stringify({ data: { items: [{ title: "One" }, { title: "Two" }, { title: "Three" }], count: 3 } });
check(
	"fetch reads one value at a path",
	await new FetchValueQuery({ url: "https://x.test/a", path: "data.count" }, portsOf(json)).get(),
	3,
);
const page = await new FetchRowsQuery({ url: "https://x.test/a", path: "data.items" }, portsOf(json)).list({
	offset: 1,
	limit: 1,
});
check(
	"fetch-rows pages a list at a path",
	[page.rows.map((row) => Reflect.get(row, "title")), page.total],
	[["Two"], 3],
);
check(
	"fetch-rows refuses a path that is not a list",
	await refusalOf(() => new FetchRowsQuery({ url: "https://x.test/a", path: "data.count" }, portsOf(json)).list()),
	"https://x.test/a answered data.count with something that is not a list",
);
check(
	"a failed answer is refused with its status",
	await refusalOf(() => new FetchValueQuery({ url: "https://x.test/a" }, portsOf("", 500)).get()),
	"https://x.test/a answered 500",
);
check(
	"fetch with no URL asks for one",
	await refusalOf(() => new FetchValueQuery({}, portsOf(json)).get()),
	"no address: type the URL in the settings window",
);
await new FetchSendCommand({ url: "https://x.test/hook" }, portsOf("")).run({ note: "hi" });
check("fetch-send posts what it was sent as JSON", asked.at(-1), [
	"https://x.test/hook",
	{ method: "POST", body: '{"note":"hi"}', headers: { "content-type": "application/json" } },
]);

const listed = (spec: Parameters<typeof sourcesFor>[0]): string[] => sourcesFor(spec).map((entry) => entry.id);
const forTitles = listed({ kind: "collection", describes: { title: { type: "line" } } });
check("a list of titles is offered fetched rows", forTitles.includes("@core/fetch-rows"), true);

const everyId = [...registeredQueries(), ...registeredCommands()].map((entry) => entry.id);
check(
	"no two implementations answer to one id",
	everyId.filter((id, at) => everyId.indexOf(id) !== at),
	[],
);
check(
	"and a pack naming one id twice is refused",
	await refusalOf(async () => {
		const [count] = registeredQueries().filter((entry) => entry.id === "@core/typed-value");
		if (!count) throw new Error("no typed value to name twice");
		definePack({
			id: "@twice",
			title: "Twice",
			queries: [
				{ ...count, id: "@twice/count" },
				{ ...count, id: "@twice/count" },
			],
			commands: [],
		});
	}),
	"@twice/count names two implementations of one pack",
);

console.log(`\n${failed === 0 ? "packs: clean" : `packs: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
