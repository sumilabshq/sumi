import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/core/requests";
import { CommandMenuResultsQuery } from "@widgetarium/command-menu";
import type { Door, Results, Scope } from "@widgetarium/command-menu";
import { useMenuKeys } from "../../lib/use-menu-keys.js";
import { useMenuMoves } from "../../lib/use-menu-moves.js";
import { MenuField } from "./menu-field.js";
import { MenuFoot } from "./menu-foot.js";
import { MenuScopes } from "./menu-scopes.js";
import { MenuSections } from "./menu-sections.js";
import { RowActions } from "./row-actions.js";

export interface MenuPanelProps {
	readonly door: Door;
	readonly startText: string;
}

const NO_RESULTS: Results = {
	sections: [],
	ghost: "",
	makeNew: null,
	makeNewLabel: "New tab",
	askInk: null,
};

export function MenuPanel({ door, startText }: MenuPanelProps): ReactElement {
	const [text, setText] = useState(startText);
	const [scope, setScope] = useState<Scope>("all");
	const results = useOptionalQuery(CommandMenuResultsQuery, { text, scope, door }).data ?? NO_RESULTS;
	const moves = useMenuMoves(results);
	const onKey = useMenuKeys({ door, text, setText, setScope, results, moves });
	return (
		<div className="wg-cm-body" onKeyDown={onKey}>
			<MenuField door={door} text={text} ghost={results.ghost} onText={(typed) => moves.typed(() => setText(typed))} />
			{door === "anywhere" ? (
				<MenuScopes scope={scope} onScope={(picked) => moves.typed(() => setScope(picked))} />
			) : null}
			<div className="wg-cm-hr" />
			<MenuSections sections={results.sections} moves={moves} />
			<div className="wg-cm-hr" />
			<MenuFoot door={door} text={text} results={results} moves={moves} />
			{moves.isActing && moves.picked !== null ? <RowActions row={moves.picked} moves={moves} /> : null}
		</div>
	);
}
