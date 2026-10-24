import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { useMenuOpening } from "../../../../shared/lib/menu-spot.js";
import type { ClaudeOptions } from "../../../../shared/schema/claude-options.schema.js";
import { ChooseClaudeOptionCommand } from "../../contract.js";
import { EFFORT_FACES, MODE_FACES, MODEL_FACES } from "../../lib/strip-faces.js";
import { percentOf } from "../../lib/usage-said.js";
import { ModelButton } from "./model-button.js";
import { OptionMenu } from "./option-menu.js";
import { StripButton } from "./strip-button.js";
import { UsageMenu } from "./usage-menu.js";
import { UsageRing } from "./usage-ring.js";

const PERMISSION_MODE = "Permission mode";
const EFFORT = "Effort";
const USAGE = "Usage";
const NO_USAGE = "—";
const MODE_MENU_PX = 340;
const PICK_MENU_PX = 272;

export function ClaudeOptionButtons({ claude }: { readonly claude: ClaudeOptions }): ReactElement {
	const choose = useCommand(ChooseClaudeOptionCommand);
	const mode = useMenuOpening();
	const usage = useMenuOpening();
	const effort = useMenuOpening();
	const fiveHour = claude.usage?.fiveHour ?? null;
	return (
		<>
			<StripButton label={PERMISSION_MODE} isOn={mode.spot !== null} onOpen={mode.openAt}>
				{MODE_FACES[claude.mode].label}
			</StripButton>
			<span className="wg-studio-ai-strip-space" />
			<StripButton label={USAGE} hasChevron={false} isOn={usage.spot !== null} onOpen={usage.openAt}>
				<UsageRing part={fiveHour?.used ?? null} />
				{fiveHour === null ? NO_USAGE : percentOf(fiveHour.used)}
			</StripButton>
			<ModelButton claude={claude} shown={MODEL_FACES[claude.model].label} />
			<StripButton label={EFFORT} isOn={effort.spot !== null} onOpen={effort.openAt}>
				{EFFORT_FACES[claude.effort].label}
			</StripButton>
			<OptionMenu
				label={PERMISSION_MODE}
				width={MODE_MENU_PX}
				opening={mode}
				faces={MODE_FACES}
				picked={claude.mode}
				onPick={(picked) => void choose.run({ mode: picked })}
			/>
			<UsageMenu opening={usage} usage={claude.usage} />
			<OptionMenu
				label={EFFORT}
				width={PICK_MENU_PX}
				opening={effort}
				faces={EFFORT_FACES}
				picked={claude.effort}
				onPick={(picked) => void choose.run({ effort: picked })}
			/>
		</>
	);
}
