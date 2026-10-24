import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { MenuOpening } from "../../lib/menu-spot.js";
import { GlassMenu } from "../glass-menu/glass-menu.js";
import { GlassMenuLabel } from "../glass-menu/glass-menu-label.js";
import { GlassMenuLine } from "../glass-menu/glass-menu-line.js";
import { GlassMenuRow } from "../glass-menu/glass-menu-row.js";
import { MODEL_FACES } from "../../lib/strip-faces.js";
import { AgentSetupQuery, ChooseClaudeOptionCommand, ChooseProviderCommand } from "@widgetarium/assistant";
import type { ClaudeModel, ClaudeOptions } from "@widgetarium/assistant";

export interface ModelMenuProps {
	readonly opening: MenuOpening;
	readonly claude: ClaudeOptions | null;
}

const PROVIDER = "Provider";
const MODEL = "Model";
const MODEL_MENU_PX = 272;

export function ModelMenu({ opening, claude }: ModelMenuProps): ReactElement {
	const { data: setup } = useQuery(AgentSetupQuery);
	const chooseProvider = useCommand(ChooseProviderCommand);
	const choose = useCommand(ChooseClaudeOptionCommand);
	return (
		<GlassMenu spot={opening.spot} label={PROVIDER} width={MODEL_MENU_PX} onDismiss={opening.close}>
			{setup.providers.map((provider) => (
				<GlassMenuRow
					key={provider.id}
					text={provider.label}
					mark={
						<span className={`wg-studio-ai-ready${provider.id === setup.chosen && !setup.isReady ? " is-off" : ""}`} />
					}
					isPicked={provider.id === setup.chosen}
					onPick={() => {
						opening.close();
						void chooseProvider.run({ id: provider.id });
					}}
				/>
			))}
			{claude === null ? null : (
				<>
					<GlassMenuLine />
					<GlassMenuLabel>{MODEL}</GlassMenuLabel>
					{MODELS.map((model) => (
						<GlassMenuRow
							key={model}
							text={MODEL_FACES[model].label}
							small={MODEL_FACES[model].small}
							isPicked={model === claude.model}
							onPick={() => {
								opening.close();
								void choose.run({ model });
							}}
						/>
					))}
				</>
			)}
		</GlassMenu>
	);
}

const MODELS = Object.keys(MODEL_FACES).filter((value): value is ClaudeModel => value in MODEL_FACES);
