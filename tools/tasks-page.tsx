import { createElement as h, useRef, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app, localTransport } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { TasksModule as TasksContract } from "../packages/domain/tasks/generated/contract.ts";
import { AppHostModule } from "../packages/domain/app-host/module.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { memoryWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/memory.gateway.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { TasksModule } from "../packages/domain/tasks/module.ts";
import { EMPTY_BOARD, MemoryTasksGateway } from "../packages/domain/tasks/gateways/tasks/memory.gateway.ts";
import { FixedClockGateway } from "../packages/domain/tasks/gateways/clock/clock.gateway.ts";
import { Plate } from "../apps/studio/src/features/plate/ui/plate/plate.tsx";
import { TasksPage } from "../apps/studio/src/tasks/tasks-page.tsx";
import { LinkOpener } from "../apps/studio/src/features/app-host/ui/link-opener/link-opener.tsx";
import { ChatTaskLine } from "../apps/studio/src/features/assistant/ui/chat-task-line/chat-task-line.tsx";
import { ChatTaskContext } from "../apps/studio/src/features/assistant/lib/chat-task-context.ts";
import { ChatDeliveryContext } from "../apps/studio/src/assistant/chat-delivery-context.ts";
import type { ChatDelivery, ChatDeliveryPort } from "../apps/studio/src/assistant/chat-delivery.ts";
import { FakeBrowserPagesGateway, fakeBrowser } from "./browser-fakes.ts";
import { reportsFailures } from "./page-harness.ts";
import type { PlacedTabs } from "../packages/state/places/shared/schema/tabs.schema.ts";
import { placedTabsOf, placesOver } from "./places-fixture.ts";
import { LISTED_CHAT_TITLES, WORKING_CHAT, seededBoard } from "./tasks-fixture.ts";

declare global {
	interface Window {
		__DELIVERED__?: ChatDelivery[];
		__OPENED__?: string[];
		__LINKS__?: string[];
	}
}

reportsFailures();

const NOW = Date.now();
window.__DELIVERED__ = [];
window.__OPENED__ = [];
window.__LINKS__ = [];
const LINK_LOG = "[widgetarium] link ";
const logInfo = console.info.bind(console);
console.info = (...said: unknown[]) => {
	const [first] = said;

	if (typeof first === "string" && first.startsWith(LINK_LOG)) {
		window.__LINKS__?.push(first.slice(LINK_LOG.length));
	}

	logInfo(...said);
};
const tasksLink = localTransport();
server()
	.modules(
		TasksModule.with({
			tasks: new MemoryTasksGateway(location.search === "?empty" ? EMPTY_BOARD : seededBoard(NOW)),
			clock: new FixedClockGateway(NOW),
		}),
	)
	.listen(tasksLink)
	.start({ env: {} });
const studio = app()
	.modules(
		AppHostModule,
		BrowserModule.with(fakeBrowser(new FakeBrowserPagesGateway()).parts),
		LayoutModule,
		WorkspacesModule.with(
			memoryWorkspacesParts({
				workspaces: [
					{
						id: "default",
						name: "Widgetarium",
						icon: null,
					},
				],
				currentId: "default",
				chats: {
					chats: [],
					openOnStartId: null,
				},
			}),
		),
	)
	.imports(placesOver(new MemoryTabsGateway(listedChats())), TasksContract.over(tasksLink))
	.start({ platform: "browser", scope: { workspaceId: "default" } });

const chatDelivery: ChatDeliveryPort = {
	listedChat: (chat) => Promise.resolve(chat),
	sendToChat: async (delivery: ChatDelivery) => {
		window.__DELIVERED__?.push(delivery);
		return {
			ok: true as const,
			chatId: delivery.chat ?? "new",
		};
	},
};

function listedChats(): PlacedTabs {
	const chatIds = Object.keys(LISTED_CHAT_TITLES);
	return placedTabsOf(
		{
			tabs: [],
			shownId: null,
			minted: 0,
			closed: [],
		},
		chatIds,
		[],
		Object.fromEntries(chatIds.map((chatId) => [chatId, { title: LISTED_CHAT_TITLES[chatId] ?? chatId }])),
	);
}

function hashOf(): string {
	return location.hash.slice(1);
}

function onHash(listener: () => void): () => void {
	window.addEventListener("hashchange", listener);
	return () => window.removeEventListener("hashchange", listener);
}

function TasksDemo(): ReactElement {
	const hash = useSyncExternalStore(onHash, hashOf);

	if (hash === "chat") {
		return (
			<div className="wg-root tasks-demo-chat">
				<ChatTaskContext
					value={{
						chatId: WORKING_CHAT,
						openTask: (task) => window.__OPENED__?.push(task),
					}}
				>
					<ChatTaskLine />
				</ChatTaskContext>
				<div className="tasks-demo-composer">Ask for the next change</div>
			</div>
		);
	}

	return (
		<Plate
			side="app"
			label="Tasks"
			edgeStart={null}
			lead={null}
			crumb={<span className="tasks-demo-crumb">Widgetarium / Tasks</span>}
			more={null}
			edgeEnd={null}
		>
			<TasksPage key={hash} address={hash} />
		</Plate>
	);
}

function LinkFrame(): ReactElement {
	const frame = useRef<HTMLDivElement | null>(null);
	return (
		<div ref={frame} style={{ height: "100%" }}>
			<LinkOpener frame={frame} />
			<TasksDemo />
		</div>
	);
}

const studioLayer = document.createElement("div");
studioLayer.className = "wg-root wg-portal wg-kit-portal-layer is-studio";
document.body.appendChild(studioLayer);
const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(
		<AppProvider app={studio}>
			<ChatDeliveryContext value={chatDelivery}>
				<LinkFrame />
			</ChatDeliveryContext>
		</AppProvider>,
	);
}
