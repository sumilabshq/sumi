import {
	app,
	localTransport,
	messagePortListener,
	messagePortTransport,
	orpcTransport,
} from "../packages/shared/framework/src/index.ts";
import type { RemoteTransport } from "../packages/shared/framework/src/index.ts";
import { server } from "../packages/shared/framework/src/server/index.ts";
import { check } from "./check-helpers.ts";
import * as fx from "./requests-fixture.ts";

const BURST = 1000;
const PAGES_START = {
	env: {},
	host: {
		authenticate: new fx.HeaderAuthenticate(),
	},
};

async function refusalsOfBurst(transport: RemoteTransport): Promise<string[]> {
	const client = app({
		modules: [],
		server: transport,
	});
	const refused: string[] = [];

	for (let call = 0; call < BURST; call += 1) {
		const answer = await client.send(fx.LimitedQuery);

		if (!answer.ok) {
			refused.push(answer.code);
		}
	}

	return refused;
}

const overLocal = localTransport();
const localServed = server().modules(fx.JoinedPagesServerModule).listen(overLocal).start(PAGES_START);
check(
	"a server listening in-process never rate-limits: 1000 calls of a request limited to 2 a minute all answer",
	await refusalsOfBurst(overLocal),
	[],
);
localServed.stop();

const channel = new MessageChannel();
const portServed = server()
	.modules(fx.JoinedPagesServerModule)
	.listen(messagePortListener(channel.port1))
	.start(PAGES_START);
check(
	"a frame's message port is never rate-limited, by the route or by calls waiting on the port",
	await refusalsOfBurst(messagePortTransport(channel.port2)),
	[],
);
const portClient = app({
	modules: [],
	server: messagePortTransport(channel.port2),
});
const waitingAtOnce = await Promise.all(
	Array.from({ length: 200 }, (_unused, at) => portClient.send(fx.PagesQuery, { prefix: `p${String(at)}` })),
);
check(
	"200 calls waiting on one frame port at once all answer",
	waitingAtOnce.filter((answer) => !answer.ok).length,
	0,
);
portServed.stop();
channel.port2.close();

const overHttp = server().modules(fx.JoinedPagesServerModule).start(PAGES_START);
const httpRefusals = await refusalsOfBurst(orpcTransport("http://pages.test", { fetch: overHttp.fetch }));
check(
	"the same request over the network is still limited",
	[httpRefusals.length, httpRefusals[0]],
	[BURST - 2, "rate-limited"],
);
