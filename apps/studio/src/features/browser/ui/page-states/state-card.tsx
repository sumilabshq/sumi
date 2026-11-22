import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { SumiFigure, sumiStateOf } from "@sumi/sumi-host-plugin";
import type { SumiMood } from "@sumi/sumi-host-plugin";

export interface StateCardProps {
	readonly mood: SumiMood;
	readonly title: string;
	readonly reason?: ReactNode;
	readonly children?: ReactNode;
}

const INK_PX = 88;
const CARD =
	"cv:absolute cv:inset-0 cv:z-[1] cv:flex cv:flex-col cv:items-center cv:justify-center cv:overflow-auto cv:bg-raise cv:p-10 cv:text-center cv:@max-[600px]/page:p-5";
const INK_SPOT =
	"cv:relative cv:flex cv:size-[150px] cv:flex-none cv:items-center cv:justify-center cv:@max-[600px]/page:size-[92px]";
const TITLE =
	"cv:m-0 cv:mt-[var(--space-5-5)] cv:text-[30px] cv:leading-[1.15] cv:font-medium cv:tracking-[-0.03em] cv:text-ink cv:@max-[600px]/page:mt-[var(--space-3-5)] cv:@max-[600px]/page:text-[21px] cv:@max-[600px]/page:tracking-[-0.02em]";
const REASON =
	"cv:m-0 cv:mt-2 cv:max-w-[540px] cv:text-[15px] cv:leading-normal cv:text-muted-foreground cv:@max-[600px]/page:mt-1.5 cv:@max-[600px]/page:max-w-[380px] cv:@max-[600px]/page:text-[13px]";

export function StateCard({ mood, title, reason, children }: StateCardProps): ReactElement {
	return (
		<section className={CARD} data-browser-page-state={mood}>
			<div className={INK_SPOT}>
				<SumiFigure state={sumiStateOf(mood)} size={INK_PX} />
			</div>
			<h2 className={TITLE}>{title}</h2>
			{reason === undefined ? null : <p className={REASON}>{reason}</p>}
			{children}
		</section>
	);
}
