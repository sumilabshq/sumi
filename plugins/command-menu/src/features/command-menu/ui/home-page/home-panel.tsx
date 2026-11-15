import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";
import { useHomeKeys } from "../../lib/use-home-keys.js";
import { useMenuMoves } from "../../lib/use-menu-moves.js";
import { MenuField } from "../command-menu/menu-field.js";
import { NO_RESULTS } from "../command-menu/menu-panel.js";
import { MenuSections } from "../command-menu/menu-sections.js";
import { ProfileLine } from "../command-menu/profile-line.js";
import { HomeFoot } from "./home-foot.js";

export interface HomePanelProps {
	readonly homeTabId: string;
}

const HOME_DOOR = "home";
const PLACEHOLDER = "Open an app, paste a link or ask Sumi";

export function HomePanel({ homeTabId }: HomePanelProps): ReactElement {
	const [text, setText] = useState("");
	const results = useOptionalQuery(commandMenu.results.all, { text, door: HOME_DOOR, pageId: null }).data ?? NO_RESULTS;
	const runHomeIntent = useCommand(commandMenu.doing.runHomeIntent);
	const moves = useMenuMoves(results, (intent, place) => runHomeIntent.run({ intent, homeTabId, place }));
	const onKey = useHomeKeys({ text, setText, results, moves });
	const field = {
		placeholder: PLACEHOLDER,
		text,
		ghost: results.ghost,
		isLink: results.isLink,
		onText: (typed: string) => moves.typed(() => setText(typed)),
	};
	return (
		<div className="wg-cm-home" data-command-menu-home="" onKeyDown={onKey}>
			<div className="wg-cm-column">
				<ProfileLine />
				<MenuField ask={field} start={null} end={null} onFiles={null} />
				<MenuSections sections={results.sections} isNothingFound={false} moves={moves} />
			</div>
			<HomeFoot moves={moves} />
		</div>
	);
}
