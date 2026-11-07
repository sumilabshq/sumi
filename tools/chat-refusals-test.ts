import { layJsdomGlobals } from "./jsdom-globals.ts";
import { check, tally, waitFor } from "./check-helpers.ts";
import type { AssistantPort } from "../packages/shared/core/src/engine/assistant-port.ts";

layJsdomGlobals();

const { createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { AssistantPanel } = await import("../plugins/chat/src/features/assistant/ui/assistant-panel/assistant-panel.tsx");
const { NO_ASSISTANT } = await import("../packages/shared/core/src/engine/assistant-port.ts");
const { AppProvider } = await import("../packages/shared/data-framework/src/index.ts");
const { chatAppOver } = await import("./assistant-chat-app.ts");

const LOCAL_REFUSAL = "places/app-tab was called too often; try again shortly";
const READY_SETUP = {
	isReady: true,
	providerLabel: "Claude Code",
	providers: [],
	chosen: "claude-code",
	helperAgents: false,
	renderMarkdown: null,
};

function drawnPanel(port: AssistantPort): HTMLElement {
	const host = document.createElement("div");
	document.body.append(host);
	createRoot(host).render(
		h(
			"div",
			null,
			h("span", { "data-beside-chat": "" }, "beside the chat"),
			h(AppProvider, { app: chatAppOver(port) }, h(AssistantPanel, { title: "Chat" })),
		),
	);
	return host;
}

const setupRefused = drawnPanel({
	...NO_ASSISTANT,
	can: true,
	setup: () => Promise.reject(new Error(LOCAL_REFUSAL)),
});
await waitFor(() => setupRefused.querySelector("[role=alert]") !== null && setupRefused.querySelector("textarea") !== null);
check(
	"a refused setup read is said in one line above the composer, and the chat stays",
	[
		setupRefused.querySelector("[role=alert]")?.textContent?.includes(LOCAL_REFUSAL) ?? false,
		setupRefused.querySelector("textarea") !== null,
	],
	[true, true],
);

const sessionBroken = drawnPanel({
	...NO_ASSISTANT,
	can: true,
	setup: () => Promise.resolve(READY_SETUP),
	session: () => {
		throw new Error(LOCAL_REFUSAL);
	},
});
await waitFor(() => sessionBroken.querySelector("[role=alert]") !== null);
check(
	"a chat that cannot be read at all fails inside the chat only, and what stands beside it stays",
	[
		sessionBroken.querySelector("[role=alert]")?.textContent?.includes(LOCAL_REFUSAL) ?? false,
		sessionBroken.querySelector("[data-beside-chat]") !== null,
	],
	[true, true],
);

console.log(tally.failed ? `chat refusals: ${tally.failed} check(s) failed` : "chat refusals: all checks passed");
process.exit(tally.failed ? 1 : 0);
