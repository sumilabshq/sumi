import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { CHAT_TAB_ICON_HOST, ChatTabIcon } from "../apps/studio/src/features/mascot/ui/chat-tab-icon/chat-tab-icon.tsx";
import { ChatTabStateSchema } from "../apps/studio/src/features/mascot/lib/chat-tab-state.schema.ts";
import type { ChatTabState } from "../apps/studio/src/features/mascot/lib/chat-tab-state.schema.ts";
import { reportsFailures } from "./page-harness.ts";

reportsFailures();

const COPIES_PER_STATE = 10;

const host = document.getElementById("root");
if (host === null) {
	throw new Error("chat tab icon page: no #root");
}

function HostedIcon({ state }: { readonly state: ChatTabState }): ReactElement {
	return (
		<span className={CHAT_TAB_ICON_HOST} data-host={state}>
			<ChatTabIcon state={state} />
		</span>
	);
}

function StateRow({ state }: { readonly state: ChatTabState }): ReactElement {
	return (
		<div className="row" data-row={state}>
			{Array.from({ length: COPIES_PER_STATE }, (_, at) => (
				<HostedIcon key={at} state={state} />
			))}
		</div>
	);
}

function LargeRow(): ReactElement {
	return (
		<div className="row big" id="large">
			{ChatTabStateSchema.options.map((state) => (
				<ChatTabIcon key={state} state={state} />
			))}
		</div>
	);
}

createRoot(host).render(
	<div className="wg-root">
		<div id="small">
			{ChatTabStateSchema.options.map((state) => (
				<StateRow key={state} state={state} />
			))}
		</div>
		<LargeRow />
		<div className="row big dark" id="dark">
			{ChatTabStateSchema.options.map((state) => (
				<ChatTabIcon key={state} state={state} />
			))}
		</div>
	</div>,
);
