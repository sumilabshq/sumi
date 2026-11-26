import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";

export interface OffConfirmProps {
	readonly title: string;
	readonly alsoOff: readonly string[];
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
}

export function OffConfirm({ title, alsoOff, onConfirm, onCancel }: OffConfirmProps): ReactElement {
	return (
		<div className="sumi-plugins-confirm" role="alertdialog">
			<p>
				These plugins need {title} and will turn off too: {alsoOff.join(", ")}
			</p>
			<div className="sumi-plugins-confirm-actions">
				<Button size="l" onClick={onConfirm}>
					Turn off all
				</Button>
				<Button size="l" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	);
}
