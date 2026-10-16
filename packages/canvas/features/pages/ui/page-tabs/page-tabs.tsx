import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { ReturnToViewCommand } from "../../contract.js";
import { useTurnToPage } from "../../lib/use-turn-to-page.js";
import { PageSwitch } from "./page-switch.js";

const RETURN = "Back to view";

export function PageTabs(): ReactElement {
	const anchor = useRef<HTMLSpanElement | null>(null);
	const turnToPage = useTurnToPage();
	const returnToView = useCommand(ReturnToViewCommand);
	return (
		<span ref={anchor} className="cv:flex cv:items-center cv:gap-2">
			<PageSwitch onPage={(page) => turnToPage(anchor.current, page)} />
			<Button size="s" variant="tinted" onClick={() => void returnToView.run()}>
				{RETURN}
			</Button>
		</span>
	);
}
