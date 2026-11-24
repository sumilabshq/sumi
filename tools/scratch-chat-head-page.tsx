import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { RuntimeProvider, localTransport, runtime } from "../packages/shared/data-framework/src/index.ts";
import { SlotFills } from "../packages/shared/plugin-framework/src/index.ts";
import { PluginSlotsContext } from "../packages/shared/plugin-framework/src/react/index.ts";
import type { Workspace } from "../packages/domain/workspaces/generated/contract.ts";
import { firstChats, memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { workspaces as workspacesModule } from "../packages/domain/workspaces/generated/module.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { ChatHead } from "../plugins/ai/chat/src/features/chat-page/ui/chat-page/chat-head.tsx";
import { ComposerOptions } from "../plugins/ai/chat/src/shared/ui/composer-options/composer-options.tsx";
import { HeadTitle } from "../plugins/ai/chat-title/src/features/head-title/ui/head-title/head-title.tsx";
import { WindowAppContext as TitleWindowApp } from "../plugins/ai/chat-title/src/shared/lib/window-app-context.ts";
import { SessionsChevron } from "../plugins/ai/sessions/src/features/sessions/ui/sessions-chevron/sessions-chevron.tsx";
import { SessionsPicker } from "../plugins/ai/sessions/src/features/sessions/ui/sessions-picker/sessions-picker.tsx";
import { WindowAppContext as SessionsWindowApp } from "../plugins/ai/sessions/src/features/sessions/lib/window-app-context.ts";
import { Select, SelectTrigger } from "@widgetarium/kit";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const SEEDED: readonly Workspace[] = [{ id: "sumi", name: "Sumi", icon: null, ink: "yellow" }];
const kept = firstChats();
const [first] = kept.chats;
const LONG = "Investigate why the composer usage meter drifts after a long session with many parallel agents and tools";
const TITLES: Readonly<Record<string, string>> = { short: "Chat header with sessions", long: LONG };
const variant = new URLSearchParams(location.search).get("v") ?? "short";
const chats = first === undefined ? kept : { ...kept, chats: [{ ...first, title: TITLES[variant] ?? TITLES.short ?? null }] };
const chatId = first?.id ?? "none";

const windowApp = runtime()
	.modules(workspacesModule({ injects: memoryWorkspacesParts({ workspaces: SEEDED, currentId: "sumi", chats }) }))
	.imports(chatFacts({ over: localTransport() }))
	.start({ platform: "browser", scope: { workspaceId: "sumi" } });

function StubPicker({ said }: { readonly said: string }): ReactElement {
	return (
		<Select value={said} onValueChange={() => undefined}>
			<SelectTrigger variant="ghost" size="sm">
				{said}
			</SelectTrigger>
		</Select>
	);
}

const fills = new SlotFills([
	{ slot: "chat.head-title", pluginId: "chat-title", kind: "replace" as const, component: HeadTitle },
	{ slot: "chat.head-tools", pluginId: "sessions", kind: "add" as const, component: SessionsChevron },
	{ slot: "chat.empty-options", pluginId: "sessions", kind: "add" as const, component: SessionsPicker },
	{ slot: "chat.field-options", pluginId: "model-picker", kind: "add" as const, component: () => <StubPicker said="Opus" /> },
	{ slot: "chat.field-options", pluginId: "permission-mode", kind: "add" as const, component: () => <StubPicker said="Auto" /> },
]);

const MESSAGES = Array.from({ length: 14 }, (_, at) => `Message ${String(at + 1)}: a line of the conversation scrolled under the header.`);

function Demo(): ReactElement {
	const isEmpty = variant === "empty";
	return (
		<PluginSlotsContext.Provider value={fills}>
			<TitleWindowApp.Provider value={windowApp}>
				<SessionsWindowApp.Provider value={windowApp}>
					<RuntimeProvider runtime={windowApp}>
						<div className="wg-chat-app demo-chat">
							<div className="wg-root wg-studio-ai-host">
								<div className={`wg-studio-ai${isEmpty ? " is-empty" : ""}`}>
									{isEmpty ? null : <ChatHead chatId={chatId} />}
									<div className="demo-scroll">
										{isEmpty ? null : MESSAGES.map((said) => <p key={said}>{said}</p>)}
									</div>
									<div className="demo-composer">
										<div className="wg-studio-ai-strip">
											<ComposerOptions chat={chatId} surface="chat" isEmptyChat={isEmpty} />
										</div>
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
