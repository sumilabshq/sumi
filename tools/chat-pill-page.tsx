import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AssistantPanel } from "../apps/studio/src/legacy/assistant/assistant-panel.js";
import { AppProvider, app } from "../packages/core/src/requests/index.ts";
import { MascotClientModule } from "../packages/mascot/generated/module.ts";
import { memoryMascotParts } from "../packages/mascot/generated/gateways.ts";
import { obsidianAssistantPort } from "../packages/host-obsidian/src/legacy/ai/assistant-port-obsidian.js";
import { DEFAULT_PRESET, PRESETS } from "../packages/host-obsidian/src/legacy/ai/providers.js";
import { withResult } from "../packages/host-obsidian/src/legacy/ai/tools.js";
import type { Jobs } from "../packages/host-obsidian/src/legacy/ai/job-runner.js";
import type { Session, SessionState } from "../packages/host-obsidian/src/legacy/ai/session.js";
import type { ObsidianHost } from "../packages/host-obsidian/src/legacy/host.js";
import type { AssistantCall, AssistantTurn } from "../packages/core/src/engine/assistant-port.js";
import { standIn } from "./stand-in.ts";

const T0 = Date.now() - 600000;
const TOOL = "node /Users/me/Vault/.widgetarium/bin/widgets.mjs";
const WIDGET = "/Users/me/Vault/.widgetarium/widgets/@translator/translator/widget.tsx";
const READ_LINES = 212;
const LONG_LINE =
	`  ✗ Translate as you type — ${"nothing on this page can create @untitled-app/translator's records ".repeat(3)}`.slice(
		0,
		200,
	);
const ANSWER = `Done. The pair is kept per page and the swap survives a reload.\n\n\`\`\`\n9 of 12 features are not done:\n${LONG_LINE}\n  ✓ Copy it\n\`\`\``;
const FENCE = "```";

const SHOWN_PROVIDERS = new Set(["claude-code", "opencode", "ollama"]);

const NO_JOBS: Jobs = {
	watch: () => () => {},
	version: () => 0,
	apps: () => [],
	jobsOf: () => [],
	liveOf: () => null,
	start: async () => {},
	stop: async () => {},
	note: async () => {},
	answer: async () => {},
	stopAll: async () => {},
	close: () => {},
};

const SPEC = `---
app: Translator
job: Translate what you read and say.
features:
  - title: Keep the two languages
    says: The pair survives a reload
    actions: [update]
research:
  - product: DeepL
    takes: The pair stays where you left it
    url: https://www.deepl.com
records:
  - name: Pair
    can: [update]
choices:
  - name: Keep the languages for this tile only, or for every page?
    picked: For every page
    options: [For every page, This tile only]
pages:
  - name: Translate
    body: flow
    says: One pane in, one pane out
excluded: []
checks:
  - Swap survives a reload
---
`;

const AI = {
	chosen: "claude-code",
	helperAgents: true,
	provider: DEFAULT_PRESET,
	providers: PRESETS.filter((provider) => SHOWN_PROVIDERS.has(provider.id)),
	ready: true,
	reason: null,
	skipPermissions: true,
	publishWidgets: true,
	jobsStartThemselves: true,
	jobsAtOnce: 2,
	host: standIn<ObsidianHost>(
		{ can: { renderMarkdown: true }, ui: { renderMarkdown: drawnLikeObsidian } },
		["can", "ui"],
		"chat pill host",
	),
};

function asked(ref: string, name: string, input: Readonly<Record<string, unknown>>, at: number): AssistantCall {
	return { ref, name, input, output: "", answered: false, failed: false, at };
}

function answered(call: AssistantCall, output: string, isFailed: boolean, tookMs: number): AssistantCall {
	const [landed] = withResult([call], { ref: call.ref, output, failed: isFailed, at: call.at + tookMs });
	if (!landed) throw new Error(`chat pill page: ${call.ref} did not land`);
	return landed;
}

const READ_OUTPUT = Array.from({ length: READ_LINES }, (_, at) => `${at + 1}\tline ${at + 1}`).join("\n");

const WORKED: AssistantCall[] = [
	answered(
		asked("grep", "Grep", { pattern: "languages" }, T0),
		"Found 5 files\n/a.ts\n/b.ts\n/c.ts\n/d.ts\n/e.ts",
		false,
		900,
	),
	answered(asked("read", "Read", { file_path: WIDGET }, T0 + 1000), READ_OUTPUT, false, 300),
	answered(
		asked(
			"edit",
			"Edit",
			{
				file_path: WIDGET,
				old_string: 'const pair = { from: "en", to: "de" };\nreturn <LanguageRow pair={pair} />;',
				new_string:
					"const pair = useData(getPair).data ?? DEFAULT_PAIR;\nawait keepPair({ from, to });\nreturn <LanguageRow pair={pair} />;",
			},
			T0 + 2000,
		),
		"The file has been updated successfully.",
		false,
		400,
	),
	answered(
		asked("check", "Bash", { command: `${TOOL} check @translator/translator` }, T0 + 5000),
		"the widget is clean",
		false,
		2000,
	),
	answered(
		asked("report", "Bash", { command: `${TOOL} report "Translator"` }, T0 + 8000),
		"9 of 12 features are not done:\n  ✗ Swap the direction — @translator/translator on Translate.md\n      nothing on this page can update the pair\n  ✓ Copy it",
		false,
		4000,
	),
];

const USER: AssistantTurn = { role: "user", text: "Make the Translate page remember the two languages.", calls: [] };

const DONE: SessionState = {
	turns: [
		USER,
		{ role: "agent", text: ANSWER, calls: WORKED, startedAt: T0 - 2000, endedAt: T0 + 70000, outcome: "done" },
	],
	busy: false,
	failure: null,
	session: "s-1",
	tool: null,
	phase: null,
	spent: 0,
};

const RUNNING: SessionState = {
	...DONE,
	turns: [
		USER,
		{
			role: "agent",
			text: "I'll check the page.",
			calls: [
				...WORKED,
				asked("test", "Bash", { command: "npm test", description: "Run the page test" }, Date.now() - 4000),
			],
			startedAt: T0,
		},
	],
	busy: true,
	tool: "Bash",
	phase: "tools",
};

const CHECK_FAILED: SessionState = {
	...DONE,
	turns: [
		USER,
		{
			role: "agent",
			text: "The check did not pass.",
			calls: [
				answered(
					asked("check-bad", "Bash", { command: `${TOOL} check @translator/translator` }, T0),
					"Swap didn’t keep the pair after a reload",
					true,
					1500,
				),
			],
			startedAt: T0,
			endedAt: T0 + 9000,
			outcome: "done",
		},
	],
};

const RUN_FAILED: SessionState = {
	...DONE,
	turns: [USER, { role: "agent", text: "", calls: [] }],
	failure: "claude stopped: the weekly limit was reached",
};

const ASKING: SessionState = {
	...DONE,
	turns: [
		USER,
		{
			role: "agent",
			text: "Here is the spec.",
			calls: [
				answered(asked("spec", "Bash", { command: `${TOOL} spec Translator` }, T0), "the spec is valid", false, 500),
			],
			startedAt: T0,
			endedAt: T0 + 3000,
			outcome: "done",
		},
	],
};

const HERO_ALONE: SessionState = {
	...DONE,
	turns: [
		USER,
		{
			role: "agent",
			text: "Every feature works.",
			calls: [
				answered(
					asked("report-done", "Bash", { command: `${TOOL} report "Translator"` }, T0),
					"Every kept feature is built, checked and placed.\n  ✓ Swap\n  ✓ Copy it",
					false,
					1000,
				),
			],
			startedAt: T0,
			endedAt: T0 + 2000,
			outcome: "done",
		},
	],
};

const STOPPED_KEPT: SessionState = {
	...DONE,
	turns: [
		USER,
		{ role: "agent", text: "I'll check the page.", calls: [], startedAt: T0, endedAt: T0 + 12000, outcome: "stopped" },
	],
};

const STATES: ReadonlyMap<string, SessionState> = new Map([
	["done", DONE],
	["running", RUNNING],
	["check-failed", CHECK_FAILED],
	["run-failed", RUN_FAILED],
	["asking", ASKING],
	["stopped-kept", STOPPED_KEPT],
	["hero-alone", HERO_ALONE],
]);

function sessionOf(state: SessionState): Session {
	return {
		now: () => state,
		restore: async () => {},
		watch: () => () => {},
		send: async (said) => {
			window.__SENT__ = String(said);
		},
		stop: () => {
			window.__STOPPED__ = true;
		},
		clear: async () => {},
		retry: () => {
			window.__RETRIED__ = true;
		},
	};
}

function drawnLikeObsidian(element: HTMLElement, markdown: string): () => void {
	element.replaceChildren(
		...markdown.split(FENCE).map((part, at) => (at % 2 === 1 ? codeBlockOf(part) : paragraphOf(part))),
	);
	return () => element.replaceChildren();
}

function codeBlockOf(code: string): HTMLElement {
	const block = document.createElement("pre");
	const text = block.appendChild(document.createElement("code"));
	text.textContent = code.replace(/^\n/, "");
	const copy = block.appendChild(document.createElement("button"));
	copy.className = "copy-code-button";
	copy.textContent = "⧉";
	return block;
}

function paragraphOf(said: string): HTMLElement {
	const paragraph = document.createElement("p");
	paragraph.textContent = said.trim();
	return paragraph;
}

declare global {
	interface Window {
		__ANSWER__?: string;
		__SENT__?: string;
		__STOPPED__?: boolean;
		__RETRIED__?: boolean;
	}
}

window.__ANSWER__ = ANSWER;
const which = location.hash.slice(1) || "done";
const state = STATES.get(which);
if (!state) throw new Error(`chat pill page: no state ${which}`);
const port = obsidianAssistantPort({
	session: sessionOf(state),
	settings: { choose: async () => AI, setHelperAgents: async () => AI },
	jobs: NO_JOBS,
	specs: { read: async () => SPEC, watch: () => () => {}, change: async () => {} },
	state: async () => AI,
	progress: () => ({ definition: null, refusal: "not in this page" }),
	openProviders: () => {},
	openDesign: async () => {},
});
const holder = document.getElementById("chat");
if (!holder) throw new Error("chat pill page: no #chat");
const mascotApp = app({ modules: [MascotClientModule.with(memoryMascotParts())] });
createRoot(holder).render(
	h(AppProvider, { app: mascotApp }, h(AssistantPanel, { assistant: port, title: "Untitled app" })),
);
