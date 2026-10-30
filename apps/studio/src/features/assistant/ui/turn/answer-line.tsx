import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CopyButton } from "../finish-line/copy-button.js";
import { SentTime } from "./sent-time.js";

export interface AnswerLineProps {
	readonly answeredAt: number | null;
	readonly said: string;
}

const COPY_ANSWER = "Copy the answer";

export function AnswerLine({ answeredAt, said }: AnswerLineProps): ReactElement {
	return (
		<div className="wg-studio-ai-answer-line">
			{said === "" ? null : <CopyButton label={COPY_ANSWER} text={said} />}
			{answeredAt === null ? null : <SentTime at={answeredAt} />}
		</div>
	);
}
