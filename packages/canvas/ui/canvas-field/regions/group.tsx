import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface GroupProps {
	readonly title: string;
	readonly sub?: string | undefined;
	readonly badge?: string | undefined;
	readonly mark?: string | undefined;
	readonly children?: ReactNode;
}

export function Group({ title, sub, badge, mark, children }: GroupProps): ReactElement {
	return (
		<div
			className="cv:flex cv:flex-col cv:gap-5 cv:rounded-[28px] cv:bg-raise cv:p-7 cv:ring-1 cv:ring-edge"
			data-wg-group={mark}
		>
			<header className="cv:flex cv:flex-wrap cv:items-baseline cv:gap-3 cv:text-[24px] cv:text-ink">
				<b>{title}</b>
				{badge ? (
					<span className="cv:rounded-full cv:bg-fill cv:px-2.5 cv:py-0.5 cv:text-base cv:text-muted-foreground">
						{badge}
					</span>
				) : null}
				{sub ? <span className="cv:text-lg cv:text-muted-foreground">{sub}</span> : null}
			</header>
			<div className="cv:flex cv:max-w-[5300px] cv:flex-wrap cv:items-start cv:gap-10">{children}</div>
		</div>
	);
}
