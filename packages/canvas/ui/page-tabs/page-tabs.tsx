import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/mediator";
import { ReturnToViewCommand } from "../../requests/pages/return-to-view.js";
import { ShowPageCommand } from "../../requests/pages/show-page.js";
import { fadedTurn } from "./faded-turn.js";
import { PageSwitch } from "./page-switch.js";

const RETURN = "Back to view";

export function PageTabs(): ReactElement {
	const anchor = useRef<HTMLSpanElement | null>(null);
	const showPage = useCommand(ShowPageCommand);
	const returnToView = useCommand(ReturnToViewCommand);
	const onPage = (page: string): void => fadedTurn(anchor.current, () => void showPage.run({ page }));
	return (
		<span ref={anchor} className="cv:flex cv:items-center cv:gap-2">
			<PageSwitch onPage={onPage} />
			<Button size="s" variant="tinted" onClick={() => void returnToView.run()}>
				{RETURN}
			</Button>
		</span>
	);
}
