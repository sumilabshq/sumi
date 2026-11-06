import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import { catchLinks, wearSumiTheme } from "@sumi/contract";
import { IsTooltipHosted, TooltipHost } from "@widgetarium/kit";
import { ChatOfTab } from "./chat-of-tab.js";
import type { SumiShell } from "./sumi/sumi-shell.js";
import { useTabChat } from "./use-tab-chat.js";

export function ChatRoot({ shell }: { readonly shell: SumiShell }): ReactElement {
	const tab = useTabChat(shell);
	useWearsSumi(shell);
	return (
		<IsTooltipHosted.Provider value={true}>
			<div className="wg-chat-app">
				<ChatOfTab tab={tab} shell={shell.app} />
			</div>
			<TooltipHost />
		</IsTooltipHosted.Provider>
	);
}

function useWearsSumi({ app, transport, tabId }: SumiShell): void {
	useEffect(() => wearSumiTheme({ sumi: app, transport }), [app, transport]);
	useEffect(() => catchLinks({ sumi: app, tabId }), [app, tabId]);
}
