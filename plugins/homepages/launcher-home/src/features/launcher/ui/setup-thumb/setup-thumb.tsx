import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Setup } from "@sumi/setups/contract";
import type { Row } from "@sumi/command-menu/contract";
import { PaneIcon } from "../pane-icon/pane-icon.js";

export interface SetupThumbProps {
	readonly setup: Setup;
	readonly appRows: readonly Row[];
}

const CHAT = "Chat";
const CHAT_APP = "chat";

export function SetupThumb({ setup, appRows }: SetupThumbProps): ReactElement {
	const right = setup.panes.filter(({ besideAt }) => besideAt === 0);
	const below = setup.panes.filter(({ besideAt }) => besideAt > 0);
	return (
		<span className="sumi-launcher-thumb" aria-hidden="true">
			<span className="sumi-launcher-pane">
				<PaneIcon app={CHAT_APP} title={CHAT} appRows={appRows} />
			</span>
			<span className="sumi-launcher-column">
				{[...right, ...below].map((pane) => (
					<span key={pane.app} className="sumi-launcher-pane">
						<PaneIcon app={pane.app} title={pane.title} appRows={appRows} />
					</span>
				))}
			</span>
		</span>
	);
}
