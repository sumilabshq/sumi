import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Authenticate, RuntimeProvider, localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import type { User } from "../packages/shared/data-framework/src/index.ts";
import { SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import { PluginSlotsContext } from "../packages/shared/plugin-framework/src/react/index.ts";
import { terminal } from "@sumi/contract";
import type { ProgramOutput, RunProgramInput } from "@sumi/contract";
import type { Workspace } from "../packages/domain/workspaces/generated/contract.ts";
import {
	firstChats,
	memoryWorkspacesParts,
} from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { workspaces as workspacesModule } from "../packages/domain/workspaces/generated/module.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { ChatHead } from "../plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-head.tsx";
import { WindowAppContext as TitleWindowApp } from "../plugins/ai/chat-title/src/shared/lib/window-app-context.ts";
import { SessionsChip } from "../plugins/ai/sessions/src/features/sessions/ui/sessions-chip/sessions-chip.tsx";
import { WindowAppContext as SessionsWindowApp } from "../plugins/ai/sessions/src/features/sessions/lib/window-app-context.ts";
import { ContextBar } from "../plugins/ai/chat-context/src/features/chat-context/ui/chat-context/chat-context.tsx";
import { chatContext as chatContextContract } from "../plugins/ai/chat-context/data/chat-context/generated/contract.ts";
import { chatContext as chatContextModule } from "../plugins/ai/chat-context/data/chat-context/generated/module.ts";
import { MemoryEditorChoiceGateway } from "../plugins/ai/chat-context/data/chat-context/gateways/editor-choice/memory.gateway.ts";
import { MemoryProcessesGateway } from "../apps/tauri/capabilities/terminal/gateways/processes/memory.gateway.ts";
import { ProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/programs.gateway.ts";
import { MemoryTerminalSessionsGateway } from "../apps/tauri/capabilities/terminal/gateways/terminal-sessions/memory.gateway.ts";
import { terminal as terminalModule } from "../apps/tauri/capabilities/terminal/generated/module.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const variant = new URLSearchParams(location.search).get("v") ?? "git";
const LONG_FOLDER =
	"/Users/demo/Projects/Sumilabs/Sumi-worktrees/chat-context-redesign/packages/shared/kit/src/components";
const FOLDER =
	variant === "plain" ? "/Users/demo/notes" : variant === "long" ? LONG_FOLDER : "/Users/demo/Projects/Sumi";
const SEEDED: readonly Workspace[] = [{ id: "sumi", name: "Sumi", icon: null, ink: "yellow" }];
const kept = firstChats();
const [first] = kept.chats;
const chats = first === undefined ? kept : { ...kept, chats: [{ ...first, title: "Chat header with context" }] };
const chatId = first?.id ?? "none";

const opened: RunProgramInput[] = [];
Reflect.set(window, "__OPENED__", opened);

class DemoPrograms extends ProgramsGateway {
	override async runProgram(input: RunProgramInput): Promise<ProgramOutput> {
		if (input.program === "ls") {
			return { out: "Cursor.app\nSafari.app\nZed.app\n", err: "", code: 0 };
		}

		if (input.program === "open") {
			opened.push(input);
			return { out: "", err: "", code: 0 };
		}

		const inRepo = variant === "git";
		return {
			out: inRepo ? "feat/chat-context\n" : "",
			err: inRepo ? "" : "not a git repository",
			code: inRepo ? 0 : 128,
		};
	}
}

class AnyUser extends Authenticate {
	override async userOf(): Promise<User | null> {
		return { id: "chat-context", permissions: [] };
	}
}

const core = runtime()
	.modules(
		terminalModule({
			injects: {
				sessions: new MemoryTerminalSessionsGateway(),
				programs: new DemoPrograms(),
				processes: new MemoryProcessesGateway(),
			},
		}),
	)
	.start({ platform: "server", env: {} });
const toCore = localTransport();
toCore.serve(core, { authenticate: new AnyUser() });

const windowApp = runtime()
	.modules(workspacesModule({ injects: memoryWorkspacesParts({ workspaces: SEEDED, currentId: "sumi", chats }) }))
	.imports(chatFacts({ over: localTransport() }))
	.start({ platform: "browser", scope: { workspaceId: "sumi" } });

const contextApp = runtime()
	.modules(chatContextModule({ injects: { editorChoice: new MemoryEditorChoiceGateway() } }))
	.imports(terminal({ over: toCore }))
	.start({ platform: "browser", scope: { workspaceId: "sumi" } });
Reflect.set(window, "__READ__", () => contextApp.send(chatContextContract.context.read, { folder: FOLDER }));

function Context(): ReactElement | null {
	return variant === "none" ? null : <ContextBar folder={FOLDER} />;
}

const sessionsFill = {
	slot: "chat.head-title",
	pluginId: "sessions",
	kind: "replace" as const,
	component: SessionsChip,
};
const contextFill = { slot: "chat.head-tools", pluginId: "chat-context", kind: "add" as const, component: Context };
const toolFills = [sessionsFill, contextFill];

const fills = new SlotFills([
	...toolFills,
]);

const MESSAGES = Array.from(
	{ length: 14 },
	(_, at) => `Message ${String(at + 1)}: a line of the conversation scrolled under the header.`,
);

function Demo(): ReactElement {
	return (
		<PluginSlotsContext.Provider value={fills}>
			<TitleWindowApp.Provider value={windowApp}>
				<SessionsWindowApp.Provider value={windowApp}>
					<RuntimeProvider runtime={contextApp}>
						<div className="wg-chat-app demo-chat">
							<div className="wg-root wg-studio-ai-host">
								<div className="wg-studio-ai">
									<ChatHead chatId={chatId} />
									<div className="demo-scroll">
										{MESSAGES.map((said) => (
											<p key={said}>{said}</p>
										))}
									</div>
								</div>
							</div>
						</div>
					</RuntimeProvider>
				</SessionsWindowApp.Provider>
			</TitleWindowApp.Provider>
		</PluginSlotsContext.Provider>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(<Demo />);
}
