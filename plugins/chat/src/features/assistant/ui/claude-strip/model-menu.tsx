import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import type { MenuOpening } from "../../lib/menu-spot.js";
import { ChatMenu } from "../chat-menu/chat-menu.js";
import { ModelsPane } from "./models-pane.js";
import { ProvidersPane } from "./providers-pane.js";
import { ChooseClaudeModelCommand, ChooseProviderCommand, OpenProvidersCommand } from "@widgetarium/assistant";
import type { AgentSetup, ClaudeOptions } from "@widgetarium/assistant";
import { useChatKey } from "../../../../shared/lib/chat-key-context.js";

export interface ModelMenuProps {
	readonly opening: MenuOpening;
	readonly setup: AgentSetup;
	readonly claude: ClaudeOptions | null;
}

export function ModelMenu({ opening, setup, claude }: ModelMenuProps): ReactElement {
	const [browsedProviderId, setBrowsedProviderId] = useState<string | null>(null);
	const chat = useChatKey();
	const chooseProvider = useCommand(ChooseProviderCommand);
	const chooseClaudeModel = useCommand(ChooseClaudeModelCommand);
	const openProviders = useCommand(OpenProvidersCommand);
	const shownProviderId = browsedProviderId ?? setup.chosen;
	const closeMenu = (): void => {
		setBrowsedProviderId(null);
		opening.close();
	};

	return (
		<ChatMenu spot={opening.spot} align="center" onDismiss={closeMenu}>
			<div className="wg-studio-ai-menu-panes">
				<ProvidersPane
					setup={setup}
					shownProviderId={shownProviderId}
					onBrowse={setBrowsedProviderId}
					onManage={() => {
						closeMenu();
						void openProviders.run({ chat });
					}}
				/>
				<div role="separator" aria-orientation="vertical" className="wg-studio-ai-menu-pane-divider" />
				<ModelsPane
					setup={setup}
					claude={claude}
					shownProviderId={shownProviderId}
					onPickModel={(model) => {
						closeMenu();
						void chooseClaudeModel.run({ chat, model });
					}}
					onPickProvider={(id) => {
						closeMenu();
						void chooseProvider.run({ chat, id });
					}}
				/>
			</div>
		</ChatMenu>
	);
}
