import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export function SkipButton({ label, onSkip }: { readonly label: string; readonly onSkip: () => void }): ReactElement {
	return (
		<button type="button" className="wg-questions-skip" onClick={onSkip}>
			<Icon name="skip-forward" />
			{label}
		</button>
	);
}
