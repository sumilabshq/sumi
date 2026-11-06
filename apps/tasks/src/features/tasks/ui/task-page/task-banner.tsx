import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { AcceptTaskCommand, KeepTaskCommand } from "@widgetarium/tasks";
import type { TaskCard } from "@widgetarium/tasks";
import { useCommand } from "@widgetarium/framework";
import { Button } from "@widgetarium/kit";
import { StatusGlyph } from "../status-glyph/status-glyph.js";
import { BannerSaid } from "./banner-said.js";
import { ContinueButton } from "./continue-button.js";
import { SendBackFold } from "./send-back-fold.js";

export interface TaskBannerProps {
	readonly card: TaskCard;
	readonly showsStatus?: boolean;
}

export function TaskBanner({ card, showsStatus = true }: TaskBannerProps): ReactElement | null {
	const accept = useCommand(AcceptTaskCommand).with({ task: card.id });
	const keep = useCommand(KeepTaskCommand).with({ task: card.id });
	const [isSendingBack, setSendingBack] = useState(false);

	if (!hasBannerContent(card)) {
		return null;
	}

	return (
		<div className="wg-tasks-banner-wrap">
			<div
				className="wg-tasks-banner"
				data-tasks-banner={card.status}
				data-your-turn={card.isYourTurn ? "" : undefined}
			>
				{showsStatus ? <StatusGlyph status={card.status} /> : null}
				{showsStatus ? <span className="wg-tasks-banner-status">{card.statusLabel}</span> : null}
				<BannerSaid card={card} />
				<span className="wg-tasks-fill" />
				{card.actions.includes("keep") ? (
					<Button variant="secondary" size="s" onClick={() => void keep.run()}>
						Keep
					</Button>
				) : null}
				{card.actions.includes("send_back") && !isSendingBack ? (
					<Button variant="secondary" size="s" data-tasks-send-back-open="" onClick={() => setSendingBack(true)}>
						Send back
					</Button>
				) : null}
				{card.actions.includes("accept") ? (
					<Button variant="primary" size="s" data-tasks-accept="" onClick={() => void accept.run()}>
						Accept
					</Button>
				) : null}
				{card.actions.includes("continue") ? <ContinueButton card={card} /> : null}
			</div>
			<SendBackFold card={card} isOpen={isSendingBack} close={() => setSendingBack(false)} />
		</div>
	);
}

function hasBannerContent(card: TaskCard): boolean {
	return card.actions.length > 0 || card.isYourTurn || card.status === "blocked" || card.status === "paused";
}
