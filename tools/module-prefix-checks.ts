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
import type {
	RemoteTransport,
	Runtime,
	ServedCall,
	ServerSideModule,
} from "../packages/shared/data-framework/src/index.ts";
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

const AMBIGUOUS_ECHO =
	"echo.talk.said is served by left.echo.talk.said, right.echo.talk.said, and no prefix picks one: send it from a module of one of them, or import the contract with its prefix";
const AMBIGUOUS_VOICE =
	"voice.talk.spoken is served by left.voice.talk.spoken, right.voice.talk.spoken, and no prefix picks one: send it from a module of one of them, or import the contract with its prefix";

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
	[prefixedModule(echo, null) === echo, exposedNamesOf(serverWith(prefixedModule(echo, "echo-3")))],
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
const unpicked = await createFrameRelay(twinRoutes, null).answer(frameCall);
check(
	"the frame relay sends a frame's bare name to its own plugin's prefixed module first, and refuses a choice it cannot make, naming the candidates",
	[relayedNames, unpicked.ok ? "answered" : unpicked.reason],
	[["right.echo.talk.said"], AMBIGUOUS_ECHO],
);

const voiceDefinition = module("voice")
	.on(Anywhere)
	.config<{ readonly word: string }>()
	.guard(PublicGuard)
	.provide(({ config }) => ({
		line: {
			word: config.word,
		},
	}));
const { query: voiceQuery } = buildersOf<typeof voiceDefinition, never>();
const spoken = voiceQuery()
	.public()
	.output(z.string())
	.handle((_input, { line }) => line.word);
const voice = handledModule(voiceDefinition, [named("talk.spoken", spoken)]);
const voiceContract = moduleContract("voice", Anywhere, {
	talk: {
		spoken: named("talk.spoken", contractQuery().public().output(z.string())),
	},
});
const givenConfigs: object[] = [];
const keeperDefinition = module("keeper")
	.on(Anywhere)
	.config<{ readonly word: string }>()
	.guard(PublicGuard)
	.provide(({ config }) => {
		givenConfigs.push(config);
		return {};
	});
const keeper = handledModule(keeperDefinition, []);
const keeperConfig = {
	word: "kept",
};
serverWith(keeper(keeperConfig), keeper({ word: "prefixed", prefix: "keeper-2" }));
check(
	"a module called with no prefix receives the given config object itself; with one, a copy without prefix",
	[givenConfigs[0] === keeperConfig, givenConfigs[1]],
	[true, { word: "prefixed" }],
);

const callerDefinition = module("caller")
	.on(Anywhere)
	.imports(voiceContract)
	.guard(PublicGuard)
	.provide(() => ({}));
const { query: callerQuery } = buildersOf<typeof callerDefinition, never>();
const heard = callerQuery()
	.public()
	.output(z.string())
	.handle((_input, { send }) => send(voiceContract.talk.spoken));
const caller = handledModule(callerDefinition, [named("talk.heard", heard)]);
const callerContract = moduleContract("caller", Anywhere, {
	talk: {
		heard: named("talk.heard", contractQuery().public().output(z.string())),
	},
});

async function heardBy(started: Runtime): Promise<string> {
	const answer = await started.send(callerContract.talk.heard);
	return answer.ok ? String(answer.output) : answer.reason;
}

const twoVoices = [voice({ word: "left", prefix: "left" }), voice({ word: "right", prefix: "right" })];
const voicesServed = localTransport();
voicesServed.serve(serverWith(...twoVoices));
const bareVoice = await serverWith(...twoVoices).send(voiceContract.talk.spoken);
check(
	"an in-process send reaches the sender's own prefix first; two prefixed candidates and no sender prefix are refused, naming them",
	[
		await heardBy(serverWith(...twoVoices, caller({ prefix: "right" }))),
		await heardBy(serverWith(...twoVoices, caller({ prefix: "left" }))),
		bareVoice.ok ? "answered" : [bareVoice.code, bareVoice.reason],
	],
	["right", "left", ["not-found", AMBIGUOUS_VOICE]],
);
check(
	"a send through imported contracts reaches the import of the sender's own prefix",
	await heardBy(
		runtime()
			.modules(caller({ prefix: "right" }))
			.imports(
				voiceContract({ over: voicesServed, prefix: "left" }),
				voiceContract({ over: voicesServed, prefix: "right" }),
			)
			.start({ platform: "server", env: {}, scope: { workspaceId: "prefix-checks" } }),
	),
	"right",
);

if (tally.failed > 0) {
	process.exit(1);
}

console.log("module prefix: all checks passed");
