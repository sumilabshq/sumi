import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { commandMenu } from "@sumi/command-menu/contract";
import type { Intent, Results, Section } from "@sumi/command-menu/contract";
import { useHomeKeys } from "../../lib/use-home-keys.js";
import { useMenuMoves } from "../../lib/use-menu-moves.js";
import { MenuField } from "../command-menu/menu-field.js";
import { NO_RESULTS } from "../command-menu/menu-panel.js";
import { MenuSections } from "../command-menu/menu-sections.js";
import { ProfileLine } from "../command-menu/profile-line.js";
import { HOME_HINTS, HomeFoot } from "./home-foot.js";

export interface HomeIdleView {
	readonly sections: readonly Section[];
	readonly run: (intent: Intent) => void;
}

export type HomeIdle = (view: HomeIdleView) => ReactNode;

export interface HomePanelProps {
	readonly homeTabId: string;
	readonly head: ReactNode;
	readonly idle: HomeIdle | null;
	readonly placeholder: string | null;
	readonly fieldStart: ReactNode;
	readonly fieldEnd: ReactNode;
	readonly isHintless: boolean;
	readonly isFieldFramed?: boolean;
}

const HOME_DOOR = "home";
const PLACEHOLDER = "Open an app, paste a link or ask Sumi";

export function HomePanel({
	homeTabId,
	head,
	idle,
	placeholder,
	fieldStart,
	fieldEnd,
	isHintless,
	isFieldFramed = false,
}: HomePanelProps): ReactElement {
	const [text, setText] = useState("");
	const results = useOptionalQuery(commandMenu.results.all, { text, door: HOME_DOOR, pageId: null }).data ?? NO_RESULTS;
	const isIdle = idle !== null && text === "";
	const listed: Results = isIdle ? NO_RESULTS : results;
	const runHomeIntent = useCommand(commandMenu.doing.runHomeIntent);
	const moves = useMenuMoves(listed, (intent, place) => runHomeIntent.run({ intent, homeTabId, place }));
	const onKey = useHomeKeys({ text, setText, results: listed, moves });
	const field = {
		placeholder: placeholder ?? PLACEHOLDER,
		text,
		ghost: results.ghost,
		isLink: results.isLink,
		onText: (typed: string) => moves.typed(() => setText(typed)),
	};
	return (
		<div className="wg-cm-home" data-command-menu-home="" data-cm-idle={isIdle ? "" : undefined} onKeyDown={onKey}>
			<div className="wg-cm-column">
				{head ?? <ProfileLine />}
				<MenuField ask={field} start={fieldStart} end={fieldEnd} onFiles={null} isFramed={isFieldFramed} />
				{isIdle ? (
					idle({ sections: results.sections, run: moves.run })
				) : (
					<MenuSections sections={listed.sections} isNothingFound={false} moves={moves} />
				)}
			</div>
			<HomeFoot moves={moves} hints={isHintless ? [] : HOME_HINTS} />
		</div>
	);
}
