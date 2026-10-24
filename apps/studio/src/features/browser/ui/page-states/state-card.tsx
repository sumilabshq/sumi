import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { MascotFigure } from "../../../mascot/ui/mascot-figure/mascot-figure.js";
import type { MascotState } from "../../../mascot/lib/mascot-state.schema.js";

export interface StateCardProps {
	readonly mood: MascotState;
	readonly title: string;
	readonly reason?: ReactNode;
	readonly children?: ReactNode;
}

const INK_PX = 150;
const CARD =
	"cv:absolute cv:inset-0 cv:z-[1] cv:flex cv:flex-col cv:items-center cv:justify-center cv:overflow-auto cv:bg-raise cv:p-10 cv:text-center cv:@max-[600px]/page:p-5";
const INK_SPOT = "cv:relative cv:size-[150px] cv:flex-none cv:@max-[600px]/page:size-[92px]";
const INK_SCALE = "cv:origin-top-left cv:@max-[600px]/page:scale-[0.6133]";
const TITLE =
	"cv:m-0 cv:mt-[22px] cv:text-[30px] cv:leading-[1.15] cv:font-medium cv:tracking-[-0.03em] cv:text-ink cv:@max-[600px]/page:mt-[14px] cv:@max-[600px]/page:text-[21px] cv:@max-[600px]/page:tracking-[-0.02em]";
const REASON =
	"cv:m-0 cv:mt-2 cv:max-w-[540px] cv:text-[15px] cv:leading-normal cv:text-muted-foreground cv:@max-[600px]/page:mt-1.5 cv:@max-[600px]/page:max-w-[380px] cv:@max-[600px]/page:text-[13px]";

export function StateCard({ mood, title, reason, children }: StateCardProps): ReactElement {
	return (
		<section className={CARD} data-browser-page-state={mood}>
			<div className={INK_SPOT}>
				<div className={INK_SCALE}>
					<MascotFigure outfit="bare" size={INK_PX} state={mood} />
				</div>
			</div>
			<h2 className={TITLE}>{title}</h2>
			{reason === undefined ? null : <p className={REASON}>{reason}</p>}
			{children}
		</section>
	);
}
