import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand } from "@widgetarium/framework";
import { useMenuOpening } from "../../lib/menu-spot.js";
import { EFFORT_FACES, MODE_FACES } from "../../lib/strip-faces.js";
import { OptionMenu } from "./option-menu.js";
import { StripButton } from "./strip-button.js";
import { ChooseClaudeOptionCommand } from "@widgetarium/assistant";
import type { ClaudeOptions } from "@widgetarium/assistant";

export interface ClaudeOptionButtonsProps {
	readonly claude: ClaudeOptions;
	readonly usage?: ReactNode;
	readonly modelButton: ReactNode;
}

const PERMISSION_MODE = "Permission mode";
const EFFORT = "Effort";

export function ClaudeOptionButtons({ claude, usage = null, modelButton }: ClaudeOptionButtonsProps): ReactElement {
	const choose = useCommand(ChooseClaudeOptionCommand);
	const mode = useMenuOpening();
	const effort = useMenuOpening();
	return (
		<>
			<StripButton label={PERMISSION_MODE} isOn={mode.spot !== null} onOpen={mode.openAt}>
				{MODE_FACES[claude.mode].label}
			</StripButton>
			<span className="wg-studio-ai-strip-space" />
			{usage}
			{modelButton}
			<StripButton label={EFFORT} isOn={effort.spot !== null} onOpen={effort.openAt}>
				{EFFORT_FACES[claude.effort].label}
			</StripButton>
			<OptionMenu
				label={PERMISSION_MODE}
				opening={mode}
				faces={MODE_FACES}
				picked={claude.mode}
				onPick={(picked) => void choose.run({ mode: picked })}
			/>
			<OptionMenu
				label={EFFORT}
				opening={effort}
				faces={EFFORT_FACES}
				picked={claude.effort}
				onPick={(picked) => void choose.run({ effort: picked })}
			/>
		</>
	);
}
