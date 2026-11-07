import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { CopyButton } from "../finish-line/copy-button.js";
import { SentTime } from "./sent-time.js";

export interface MineLineProps {
	readonly sentAt: number | null;
	readonly said: string;
}

const READ_RECEIPT = "Read by Sumi";
const COPY_MESSAGE = "Copy the message";

export function MineLine({ sentAt, said }: MineLineProps): ReactElement {
	return (
		<div className="wg-studio-ai-mine-line">
			<Icon name="check-check" size={13} />
			<span>{READ_RECEIPT}</span>
			{sentAt === null ? null : <SentTime at={sentAt} />}
			{said === "" ? null : <CopyButton label={COPY_MESSAGE} text={said} />}
		</div>
	);
}
