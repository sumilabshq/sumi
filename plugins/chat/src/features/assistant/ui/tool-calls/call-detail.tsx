import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useMountsCodeBlock } from "../../lib/use-mounts-code-block.js";

export interface CallDetailProps {
	readonly label: string;
	readonly said: string;
	readonly language: string;
}

export function CallDetail({ label, said, language }: CallDetailProps): ReactElement {
	const holder = useMountsCodeBlock(language, said);
	return (
		<div className="wg-studio-ai-call-part">
			<span className="wg-studio-ai-call-part-label">{label}</span>
			<div ref={holder} className="wg-studio-ai-said is-markdown" />
		</div>
	);
}
