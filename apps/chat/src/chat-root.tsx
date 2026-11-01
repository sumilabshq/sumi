import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { AppTabQuery, catchLinks, wearSumiTheme } from "@sumi/contract";
import { ChatOfTab } from "./chat-of-tab.js";
import type { SumiShell } from "./sumi/sumi-shell.js";
import type { TabRead } from "./tab-read.js";

export function ChatRoot({ shell }: { readonly shell: SumiShell }): ReactElement {
	const tab = useTabChat(shell);
	useWearsSumi(shell);
	return (
		<div className="wg-chat-app">
			<ChatOfTab tab={tab} shell={shell.app} />
		</div>
	);
}

function useTabChat({ app, transport, tabId }: SumiShell): TabRead {
	const [tab, setTab] = useState<TabRead>({
		kind: "reading",
	});
	useEffect(() => {
		const read = (): void =>
			void app
				.send(AppTabQuery, {
					id: tabId,
				})
				.then((answer) =>
					setTab(
						answer.ok
							? {
									kind: "read",
									chatId: answer.output.chatId,
								}
							: {
									kind: "failed",
									reason: answer.reason,
								},
					),
				);
		read();
		return transport.changes(read);
	}, [app, transport, tabId]);
	return tab;
}

function useWearsSumi({ app, transport, tabId }: SumiShell): void {
	useEffect(() => wearSumiTheme({ sumi: app, transport }), [app, transport]);
	useEffect(() => catchLinks({ sumi: app, tabId }), [app, tabId]);
}
