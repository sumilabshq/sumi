import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { GlassMenu } from "../../../../shared/ui/glass-menu/glass-menu.js";
import { GlassMenuNote } from "../../../../shared/ui/glass-menu/glass-menu-note.js";
import { GlassMenuRow } from "../../../../shared/ui/glass-menu/glass-menu-row.js";
import { SLASH_FACES } from "../../lib/slash-matches.js";
import type { SlashMenu as SlashMenuState } from "../../lib/use-slash-menu.js";

export interface SlashMenuProps {
	readonly slash: SlashMenuState;
	readonly draft: string;
}

const SLASH_MENU_PX = 340;
const NO_MATCH = "No commands match “{typed}”";

export function SlashMenu({ slash, draft }: SlashMenuProps): ReactElement {
	return (
		<GlassMenu spot={slash.spot} width={SLASH_MENU_PX} onDismiss={slash.dismiss}>
			{slash.matches.length === 0 ? <GlassMenuNote>{NO_MATCH.replace("{typed}", draft)}</GlassMenuNote> : null}
			{slash.matches.map((name) => (
				<GlassMenuRow
					key={name}
					text={`/${name}`}
					small={SLASH_FACES[name].said}
					mark={<Icon name={SLASH_FACES[name].icon} size={16} />}
					isActive={name === slash.active}
					onPick={() => slash.run(name)}
				/>
			))}
		</GlassMenu>
	);
}
