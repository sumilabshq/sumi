import { handler, refuse } from "@widgetarium/core/requests";
import { ActiveChatGateway } from "../../gateways/active-chat/active-chat.gateway.js";
import { AppTabsGateway } from "../../gateways/app-tabs/app-tabs.gateway.js";
import { PageFactsGateway } from "../../gateways/page-facts/page-facts.gateway.js";
import { HostTabs } from "../../shared/lib/host-tabs/host-tabs.js";
import { findGroup } from "../../shared/lib/host-tabs/tab-lists.js";
import type { TabGroup } from "../../shared/lib/host-tabs/tab-lists.js";
import { closeGroupTabs } from "../../shared/lib/tab-showing/close-tab.js";
import {
	CloseGroupCommand,
	SetGroupHueCommand,
	FoldGroupCommand,
	CreateGroupCommand,
	RenameGroupCommand,
	UngroupCommand,
} from "./contract.js";
import { AppHostClientModule } from "../../module.js";

const NO_GROUP = 'no group "{id}"';
const NOT_HELD = 'the host holds no tab "{id}"';
const NAMELESS = "a group needs a name";

export const CreateGroupCommandHandler = handler(CreateGroupCommand, AppHostClientModule)
	.inject({
		hostTabs: HostTabs,
		activeChatGateway: ActiveChatGateway,
	})
	.handle(({ withTabId }, { hostTabs, activeChatGateway }) => {
		if (withTabId !== null && !hostTabs.now().tabs.some((tab) => tab.id === withTabId)) {
			return refuse(NOT_HELD.replace("{id}", withTabId));
		}

		return { id: hostTabs.newGroup(activeChatGateway.now().id, withTabId) };
	});

export const RenameGroupCommandHandler = handler(RenameGroupCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id, name }, { hostTabs }) => {
		if (!findGroupIn(hostTabs, id)) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		if (name.trim() === "") {
			return refuse(NAMELESS);
		}

		hostTabs.changeGroup(id, { name: name.trim() });
	});

export const SetGroupHueCommandHandler = handler(SetGroupHueCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id, hue }, { hostTabs }) => {
		if (!findGroupIn(hostTabs, id)) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		hostTabs.changeGroup(id, { hue });
	});

export const FoldGroupCommandHandler = handler(FoldGroupCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id }, { hostTabs }) => {
		const group = findGroupIn(hostTabs, id);

		if (!group) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		hostTabs.changeGroup(id, { isOpen: !group.isOpen });
	});

export const UngroupCommandHandler = handler(UngroupCommand, AppHostClientModule)
	.inject({ hostTabs: HostTabs })
	.handle(({ id }, { hostTabs }) => {
		if (!findGroupIn(hostTabs, id)) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		hostTabs.ungroup(id);
	});

export const CloseGroupCommandHandler = handler(CloseGroupCommand, AppHostClientModule)
	.inject({
		hostTabs: HostTabs,
		appTabsGateway: AppTabsGateway,
		pageFactsGateway: PageFactsGateway,
	})
	.handle(({ id }, { hostTabs, ...showing }) => {
		if (!findGroupIn(hostTabs, id)) {
			return refuse(NO_GROUP.replace("{id}", id));
		}

		closeGroupTabs(id, hostTabs, showing);
	});

function findGroupIn(hostTabs: HostTabs, id: string): TabGroup | undefined {
	return findGroup(hostTabs.now().groups, id);
}
