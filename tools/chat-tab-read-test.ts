import { layJsdomGlobals } from "./jsdom-globals.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

import type { Answer, HearChanges, RemoteTransport } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteCall } from "../packages/shared/data-framework/src/remote-server.ts";

layJsdomGlobals();

const { createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { PlacesModule } = await import("@sumi/contract");
const { ChangeBroadcast, app, refusalOf } = await import("../packages/shared/data-framework/src/index.ts");
const { useTabChat } = await import("../apps/chat/src/use-tab-chat.ts");

const TAB = "t1";
const PLACES_LIMIT = "places/app-tab was called too often; try again shortly";
const asked: string[] = [];
const answers = { refuse: false, pending: [] as (() => void)[], isHeld: false };
const heard = new ChangeBroadcast();

const transport: RemoteTransport = {
	call: ({ request }: RemoteCall): Promise<Answer<unknown>> => {
		asked.push(request.name);
		const answer: Answer<unknown> = answers.refuse
			? refusalOf("rate-limited", PLACES_LIMIT)
			: {
					ok: true as const,
					output: {
						id: TAB,
						app: "chat",
						address: null,
						title: null,
						chatId: "chat-1",
					},
					invalidated: [],
				};

		if (!answers.isHeld) {
			return Promise.resolve(answer);
		}

		return new Promise((settle) => answers.pending.push(() => settle(answer)));
	},
	changes: (hear: HearChanges) => heard.hear(hear),
};

const shell = {
	app: app()
		.imports(PlacesModule.over(transport))
		.start({
			platform: "browser",
			scope: {
				workspaceId: "chat",
			},
		}),
	transport,
	tabId: TAB,
};

function TabProbe() {
	const tab = useTabChat(shell);
	return h("output", null, tab.kind === "read" ? `read ${tab.chatId ?? "none"}` : tab.kind);
}

const host = document.createElement("div");
document.body.append(host);
createRoot(host).render(h(TabProbe));
const said = (): string => host.textContent ?? "";

await waitFor(() => said() === "read chat-1");
check("the chat tab reads its chat", said(), "read chat-1");

asked.length = 0;
heard.tell([{ query: "places/sidebar", inputKey: null }]);
await new Promise((settled) => setTimeout(settled, 20));
check("a change to another query reads nothing", asked, []);

answers.refuse = true;
heard.tell([{ query: "places/app-tab", inputKey: null }]);
await waitFor(() => asked.length > 0);
await new Promise((settled) => setTimeout(settled, 20));
check("a refused re-read keeps the chat on screen", said(), "read chat-1");

answers.refuse = false;
answers.isHeld = true;
asked.length = 0;
for (let change = 0; change < 50; change += 1) {
	heard.tell([{ query: "places/app-tab", inputKey: null }]);
}
await waitFor(() => answers.pending.length > 0);
answers.pending.splice(0).forEach((settle) => settle());
await waitFor(() => answers.pending.length > 0);
answers.isHeld = false;
answers.pending.splice(0).forEach((settle) => settle());
await new Promise((settled) => setTimeout(settled, 20));
check("50 changes in a burst read the tab twice, never 50 times", asked.length, 2);

console.log(tally.failed ? `chat tab read: ${tally.failed} check(s) failed` : "chat tab read: all checks passed");
process.exit(tally.failed ? 1 : 0);
