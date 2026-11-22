import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

export interface FailureAction {
	readonly said: string;
	readonly run: () => void;
}

export interface FailureCardProps {
	readonly title: string;
	readonly reason: string;
	readonly action: FailureAction;
}

export function FailureCard({ title, reason, action }: FailureCardProps): ReactElement {
	return (
		<div className="wg-studio-ai-failure-card" role="alert">
			<span className="wg-studio-ai-failure-mark">
				<Icon name="circle-alert" size={18} />
			</span>
			<span className="wg-studio-ai-failure-text">
				<span className="wg-studio-ai-failure-title">{title}</span>
				<span className="wg-studio-ai-failure-reason">{reason}</span>
			</span>
			<Button size="l" className="wg-studio-ai-pill is-l" onClick={action.run}>
				{action.said}
			</Button>
		</div>
	);
}
