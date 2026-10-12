import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface RegionProps {
	readonly title: string;
	readonly count: number;
	readonly aside?: ReactNode;
	readonly children?: ReactNode;
}

const COUNTED = "{title} · {count}";

export function Region({ title, count, aside, children }: RegionProps): ReactElement {
	return (
		<section
			className="cv:flex cv:max-w-none cv:cursor-default cv:flex-col cv:gap-10 cv:rounded-[40px] cv:bg-group cv:p-12 cv:ring-1 cv:ring-edge"
			data-canvas-region={title}
		>
			<header className="cv:flex cv:items-center cv:gap-7 cv:text-[40px] cv:font-bold cv:text-ink">
				<span>{COUNTED.replace("{title}", title).replace("{count}", String(count))}</span>
				{aside ?? null}
			</header>
			<div className="cv:flex cv:max-w-[5500px] cv:flex-wrap cv:items-start cv:gap-14">{children}</div>
		</section>
	);
}
