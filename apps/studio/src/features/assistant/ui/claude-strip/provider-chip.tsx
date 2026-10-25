import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import { ChatMenuRow } from "../chat-menu/chat-menu-row.js";
import { AgentSetupQuery, ChooseProviderCommand } from "@widgetarium/assistant";

const PROVIDER = "Provider";

export function ProviderChip(): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery);
	const chooseProvider = useCommand(ChooseProviderCommand);
	const menu = useMenuOpening();
	const chosenLabel = setup.providers.find(({ id }) => id === setup.chosen)?.label ?? setup.providerLabel;
	return (
		<>
			<button
				type="button"
				className={`wg-studio-ai-provider${menu.spot === null ? "" : " is-on"}`}
				aria-label={PROVIDER}
				aria-haspopup="menu"
				onClick={menu.openAt}
			>
				<span className={setup.isReady ? "wg-studio-ai-ready" : "wg-studio-ai-ready is-off"} aria-hidden={true} />
				{chosenLabel}
				<Icon name="chevron-down" size={12} />
			</button>
			<ChatMenu spot={menu.spot} label={PROVIDER} onDismiss={menu.close}>
				{setup.providers.map((provider) => (
					<ChatMenuRow
						key={provider.id}
						text={provider.label}
						mark={
							<span
								className={
									provider.id === setup.chosen && !setup.isReady ? "wg-studio-ai-ready is-off" : "wg-studio-ai-ready"
								}
							/>
						}
						isPicked={provider.id === setup.chosen}
						onPick={() => {
							menu.close();
							void chooseProvider.run({ id: provider.id });
						}}
					/>
				))}
			</ChatMenu>
		</>
	);
}
