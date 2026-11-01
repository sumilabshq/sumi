import { createElement as h } from "react";
import type { ReactElement } from "react";

export function QuestionFace(): ReactElement {
	return (
		<svg className="wg-questions-face" viewBox="0 0 64 64" aria-hidden="true">
			<circle cx="32" cy="32" r="32" />
			<rect className="wg-questions-face-eye" x="21" y="19" width="7" height="20" rx="3.5" />
			<rect className="wg-questions-face-eye" x="36" y="15" width="7" height="13" rx="3.5" />
		</svg>
	);
}
