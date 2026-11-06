import type { ReactElement } from "react";
import { OpenLinkCommand } from "@sumi/contract";
import { useCommand } from "@widgetarium/data-framework";
import { useShowsHeaderActions } from "../../../../sumi/header-actions.js";
import { useSumiTab } from "../../../../sumi/sumi-tab.js";
import { chatLinkOf } from "./chat-link.js";

export interface TaskActionsProps {
	readonly owner: string | null;
}

const OPEN_CHAT = "Open chat";

export function TaskActions({ owner }: TaskActionsProps): ReactElement | null {
	const tab = useSumiTab();
	const openLink = useCommand(OpenLinkCommand);
	useShowsHeaderActions(
		owner === null
			? []
			: [
					{
						id: "open-chat",
						label: OPEN_CHAT,
						icon: "message-square",
						run: () => void openLink.run({ from: tab.tabId, href: chatLinkOf(owner), inNewTab: false }),
					},
				],
	);
	return null;
}
