import { z } from "zod";
import {
	Anywhere,
	PublicGuard,
	buildersOf,
	handledModule,
	localTransport,
	module,
	moduleContract,
	named,
	prefixedModule,
	query as contractQuery,
	runtime,
} from "../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime, ServedCall, ServerSideModule } from "../packages/shared/data-framework/src/index.ts";
import { createFrameRelay, hearsAll } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const definition = module("echo")
	.on(Anywhere)
	.guard(PublicGuard)
	.provide(() => ({}));
const { query } = buildersOf<typeof definition, never>();
const said = query()
	.public()
	.output(z.string())
	.handle(() => "said");
const echo = handledModule(definition, [named("talk.said", said)]);
const echoContract = moduleContract("echo", Anywhere, {
	talk: {
		said: named("talk.said", contractQuery().public().output(z.string())),
	},
});

function exposedNamesOf(started: Runtime): readonly string[] {
	return started.expose({ adapter: "prefix checks" }).requests.map(({ name }) => name);
}

function outsideCall(name: string): ServedCall {
	return {
		name,
		input: undefined,
		idempotencyKey: null,
		signal: new AbortController().signal,
	};
}

function serverWith(...modules: readonly ServerSideModule[]): Runtime {
	return runtime()
		.modules(...modules)
		.start({
			platform: "server",
			env: {},
			scope: {
				workspaceId: "prefix-checks",
			},
		});
}

export function refusedByTypes(): void {
	// @ts-expect-error
	module("configured").on(Anywhere).config<{ readonly prefix: string }>();
}

check("a module run with no prefix keeps its route names", exposedNamesOf(serverWith(echo)), ["echo.talk.said"]);

const prefixed = serverWith(echo({ prefix: "echo-2" }));
check(
	"a module called with a prefix registers every route as <prefix>.<name>, and an in-process send still reaches it",
	[exposedNamesOf(prefixed), (await prefixed.send(echoContract.talk.said)).ok],
	[["echo-2.echo.talk.said"], true],
);

const twins = serverWith(echo({ prefix: "left" }), echo({ prefix: "right" }));
check(
	"two modules of one name run side by side under two prefixes, each answering at its own name",
	await Promise.all(
		["left.echo.talk.said", "right.echo.talk.said"].map(async (name) => {
			const answered = await twins.expose({ adapter: "prefix checks" }).answer(outsideCall(name));
			return answered.ok;
		}),
	),
	[true, true],
);

check(
	"two modules of one name are refused at start, naming both and the string to rename",
	thrownBy(() => serverWith(echo, echo)),
	'runtime() refused:\nmodules #1 and #2 of .modules() are both named "echo": rename the module("echo") string of one; importing it under another constant does not rename it, the string is its name',
);

const served = localTransport();
served.serve(serverWith(echo({ prefix: "echo-2" })));
const importedPrefixed = runtime()
	.imports(echoContract({ over: served, prefix: "echo-2" }))
	.start();
const importedBare = runtime()
	.imports(echoContract({ over: served }))
	.start();
const answeredBare = await importedBare.send(echoContract.talk.said);
check(
	"a contract imported with a prefix sends <prefix>.<name>; imported bare it sends the bare name, which the prefixed module does not answer",
	[(await importedPrefixed.send(echoContract.talk.said)).ok, answeredBare.ok ? "answered" : answeredBare.code],
	[true, "not-found"],
);

check(
	"prefix is reserved: a value that is not one kebab segment is refused where the module or the contract is called",
	[
		thrownBy(() => echo({ prefix: "Echo" })),
		thrownBy(() => echoContract({ over: served, prefix: "echo.two" })).startsWith('"echo.two" is not a prefix'),
	],
	[
		'"Echo" is not a prefix: prefix is reserved for the name every route of a module starts with, one kebab-case segment such as "chat" or "chat-2"; a module config field cannot be named prefix',
		true,
	],
);

check(
	"the host's prefixedModule leaves a module unprefixed when the plugin has no alias, and prefixes it when it has one",
	[
		prefixedModule(echo, null) === echo,
		exposedNamesOf(serverWith(prefixedModule(echo, "echo-3"))),
	],
	[true, ["echo-3.echo.talk.said"]],
);

const relayedNames: string[] = [];
const twinsServed = localTransport();
twinsServed.serve(serverWith(echo({ prefix: "left" }), echo({ prefix: "right" })));
const recordingTwins: RemoteTransport = {
	call: (call) => {
		relayedNames.push(call.name);
		return twinsServed.call(call);
	},
	changes: (hear) => twinsServed.changes(hear),
};
const twinRoutes = ["left", "right"].map((prefix) => ({
	module: echoContract,
	prefix,
	transport: recordingTwins,
	hears: hearsAll,
}));
const frameCall = outsideCall("echo.talk.said");
await createFrameRelay(twinRoutes, "right").answer(frameCall);
await createFrameRelay(twinRoutes, null).answer(frameCall);
check(
	"the frame relay sends a frame's bare name to its own plugin's prefixed module first, and refuses a choice it cannot make",
	relayedNames,
	["right.echo.talk.said"],
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("module prefix: all checks passed");
