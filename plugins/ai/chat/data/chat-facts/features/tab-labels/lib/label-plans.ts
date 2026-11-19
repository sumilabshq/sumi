import { movedPlan } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import type { MomentPlan } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import { isChatTab } from "@widgetarium/navigation/lib/shared/lib/tabs/app-abilities";
import { chatIdOf } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import type { HostTabsMoment } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import type { AdoptedLabel, ChatTabLabel } from "../../../shared/schema/chat-facts.schema.js";
import { linkedTabsOf } from "../../../shared/lib/chat-tabs.js";

export function chatTabLabelsOf(moment: Pick<HostTabsMoment, "tabs" | "apps">): readonly ChatTabLabel[] {
	const labels = moment.tabs.flatMap((tab) =>
		isChatTab(moment.apps, tab) && tab.label !== null
			? [
					{
						chatId: chatIdOf(moment.apps, tab) ?? tab.id,
						label: tab.label,
					},
				]
			: [],
	);
	return labels.filter((one, at) => labels.findIndex(({ chatId }) => chatId === one.chatId) === at);
}

export function dropLabelPlan({ chatId, label, title }: AdoptedLabel): MomentPlan<null> {
	return (moment) => {
		const dropped = new Set(
			linkedTabsOf(moment, chatId)
				.filter((tab) => tab.label === label)
				.map(({ id }) => id),
		);

		if (dropped.size === 0) {
			return movedPlan(moment, null, null);
		}

		return movedPlan(
			moment,
			{
				moment: {
					...moment,
					tabs: moment.tabs.map((tab) => (dropped.has(tab.id)
						? {
								...tab,
								label: null,
								title,
							}
						: tab)),
				},
				reason: `label of chat ${chatId} tabs ${[...dropped].join(", ")} "${label}" → none, title → ${title} (the chat holds the name)`,
			},
			null,
		);
	};
}
