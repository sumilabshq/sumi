import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface CallDetailProps {
	readonly label: string;
	readonly said: string;
}

export function CallDetail({ label, said }: CallDetailProps): ReactElement {
	return (
		<div className="wg-studio-ai-call-part">
			<span className="wg-studio-ai-call-part-label">{label}</span>
			<pre className="wg-studio-ai-call-part-said">{said}</pre>
		</div>
	);
}
