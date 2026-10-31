import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { AppProvider, useOptionalQuery } from "@widgetarium/core/requests";
import { CommandMenuResultsQuery } from "@widgetarium/command-menu";
import type { Door, Results } from "@widgetarium/command-menu";
import { useAskComposer } from "../../lib/ask-composer-context.js";
import { useMenuKeys } from "../../lib/use-menu-keys.js";
import { useMenuMoves } from "../../lib/use-menu-moves.js";
import { useDoorSwitch } from "../../lib/use-door-switch.js";
import { AskField } from "./ask-field.js";
import { MenuField } from "./menu-field.js";
import type { MenuFieldAsk } from "./menu-field.js";
import { MenuFoot } from "./menu-foot.js";
import { MenuHead } from "./menu-head.js";
import { MenuSections } from "./menu-sections.js";
import { RowActions } from "./row-actions.js";

export interface MenuPanelProps {
	readonly door: Door;
	readonly startText: string;
	readonly pageId: string | null;
}

const NO_RESULTS: Results = {
	door: "anywhere",
	foundCount: null,
	sections: [],
	ghost: "",
	fallbackIntent: null,
	fallbackLabel: "Search the web",
	askInk: null,
};

export function MenuPanel({ door, startText, pageId }: MenuPanelProps): ReactElement {
	const [text, setText] = useState(startText);
	const results = useOptionalQuery(CommandMenuResultsQuery, { text, door, pageId }).data ?? NO_RESULTS;
	const moves = useMenuMoves(results);
	const doors = useDoorSwitch({ door, resultsDoor: results.door, typed: moves.typed });
	const shownCount = results.door === doors.shownDoor ? results.foundCount : null;
	const onKey = useMenuKeys({ door: doors.shownDoor, text, setText, results, moves, toDoor: doors.switchTo });
	const askApp = useAskComposer().app;
	const field: MenuFieldAsk = {
		door: doors.shownDoor,
		text,
		ghost: results.ghost,
		onText: (typed) => moves.typed(() => setText(typed)),
		onDoor: doors.switchTo,
	};
	return (
		<div
			className="wg-cm-body"
			data-cm-mode={doors.shownDoor}
			data-cm-leaving={doors.isLeaving ? "" : undefined}
			onKeyDown={onKey}
		>
			{askApp === null ? (
				<MenuField {...field} end={null} onFiles={null} />
			) : (
				<AppProvider app={askApp}>
					<AskField field={field} />
				</AppProvider>
			)}
			<div className="wg-cm-hr" />
			<MenuHead door={doors.shownDoor} foundCount={shownCount} onDoor={doors.switchTo} />
			<MenuSections sections={results.sections} isNothingFound={shownCount === 0} moves={moves} />
			<div className="wg-cm-hr" />
			<MenuFoot door={doors.shownDoor} text={text} results={results} moves={moves} />
			{moves.isActing && moves.picked !== null ? <RowActions row={moves.picked} moves={moves} /> : null}
		</div>
	);
}
