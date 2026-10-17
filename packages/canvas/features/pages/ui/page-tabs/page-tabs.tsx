import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { ReturnToViewCommand } from "../../contract.js";
import { useTurnToPage } from "../../lib/use-turn-to-page.js";
import { RoundButton } from "../../../../shared/ui/round-button/round-button.js";
import { PageSwitch } from "./page-switch.js";

const RETURN = "Back to view";

export function PageTabs(): ReactElement {
	const anchor = useRef<HTMLSpanElement | null>(null);
	const turnToPage = useTurnToPage();
	const returnToView = useCommand(ReturnToViewCommand);
	return (
		<span ref={anchor} className="cv:flex cv:items-center cv:gap-1.5">
			<PageSwitch onPage={(page) => turnToPage(anchor.current, page)} />
			<RoundButton label={RETURN} tone="raise" size="l" onClick={() => void returnToView.run()} data-canvas-close="">
				<Icon name="x" size={18} />
			</RoundButton>
		</span>
	);
}
