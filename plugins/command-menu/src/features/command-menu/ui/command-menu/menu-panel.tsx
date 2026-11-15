import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { RuntimeProvider, useCommand, useOptionalQuery, useQuery } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";
import type { Door, Results } from "@sumi/command-menu/contract";
import { useAskComposer } from "@sumi/sumi-host-plugin";
import { useMenuKeys } from "../../lib/use-menu-keys.js";
import { useMenuMoves } from "../../lib/use-menu-moves.js";
import { useDoorSwitch } from "../../lib/use-door-switch.js";
import { AskField } from "./ask-field.js";
import { MenuField } from "./menu-field.js";
import type { MenuFieldAsk } from "./menu-field.js";
import { MenuFoot } from "./menu-foot.js";
import { MenuHead } from "./menu-head.js";
import { MenuSections } from "./menu-sections.js";
import { ProfileLine } from "./profile-line.js";
import { RowActions } from "./row-actions.js";
import { ThisTabToken } from "./this-tab-token.js";

export interface MenuPanelProps {
	readonly door: Door;
	readonly startText: string;
	readonly pageId: string | null;
}

export const NO_RESULTS: Results = {
	door: "anywhere",
	foundCount: null,
	sections: [],
	ghost: "",
	isLink: false,
	fallbackIntent: null,
	fallbackLabel: "Search the web",
	askInk: null,
};

export function MenuPanel({ door, startText, pageId }: MenuPanelProps): ReactElement {
	const [text, setText] = useState(startText);
	const menuDoors = useQuery(commandMenu.opening.doors).data.doors;
	const results = useOptionalQuery(commandMenu.results.all, { text, door, pageId }).data ?? NO_RESULTS;
	const runIntent = useCommand(commandMenu.doing.runIntent);
	const moves = useMenuMoves(results, (intent) => runIntent.run({ intent }));
	const doors = useDoorSwitch({ door, resultsDoor: results.door, typed: moves.typed });
	const shownCount = results.door === doors.shownDoor ? results.foundCount : null;
	const onKey = useMenuKeys({
		door: doors.shownDoor,
		doors: menuDoors,
		text,
		setText,
		results,
		moves,
		toDoor: doors.switchTo,
	});
	const askApp = useAskComposer().app;
	const field: MenuFieldAsk = {
		placeholder: menuDoors.find(({ id }) => id === doors.shownDoor)?.placeholder ?? "",
		text,
		ghost: results.ghost,
		isLink: results.isLink,
		onText: (typed) => moves.typed(() => setText(typed)),
	};
	const start = doors.shownDoor === "this-tab" ? <ThisTabToken onDrop={() => doors.switchTo("anywhere")} /> : null;
	return (
		<div
			className="wg-cm-body"
			data-cm-mode={doors.shownDoor}
			data-cm-leaving={doors.isLeaving ? "" : undefined}
			onKeyDown={onKey}
		>
			<div className="wg-cm-column">
				<ProfileLine />
				{askApp === null ? (
					<MenuField ask={field} start={start} end={null} onFiles={null} />
				) : (
					<RuntimeProvider runtime={askApp}>
						<AskField field={field} door={doors.shownDoor} start={start} onDoor={doors.switchTo} />
					</RuntimeProvider>
				)}
				<MenuHead door={doors.shownDoor} doors={menuDoors} foundCount={shownCount} onDoor={doors.switchTo} />
				<MenuSections sections={results.sections} isNothingFound={shownCount === 0} moves={moves} />
			</div>
			<MenuFoot door={doors.shownDoor} text={text} results={results} moves={moves} />
			{moves.isActing && moves.picked !== null ? <RowActions row={moves.picked} moves={moves} /> : null}
		</div>
	);
}
