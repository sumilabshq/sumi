import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { canvasTopBarInject } from "../../widgets/canvas-top-bar.widget.js";
import { SlotItems } from "../slot-items/slot-items.js";
import { Corner } from "./corner.js";

const BAR =
	"cv:pointer-events-none cv:absolute cv:inset-x-0 cv:top-0 cv:z-[2] cv:flex cv:flex-row cv:items-center cv:justify-between cv:gap-4 cv:pb-10 cv:before:absolute cv:before:inset-0 cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_bottom,black_45%,transparent)] cv:*:pointer-events-auto cv:*:relative";

export function CanvasTopBar(props: InjectProps<typeof canvasTopBarInject>): ReactElement {
	const { cornersStart, start, end, cornersEnd } = props;
	const hasCorners = cornersStart.length + cornersEnd.length > 0;
	return (
		<div className={hasCorners ? BAR : `${BAR} cv:px-4 cv:pt-4`} data-canvas-topbar="">
			<div className="cv:flex cv:min-w-0 cv:items-center cv:gap-2">
				<Corner items={cornersStart} />
				<div className="cv:relative cv:flex cv:items-center cv:gap-2 cv:py-1.5 cv:text-base">
					<SlotItems items={start} />
				</div>
			</div>
			<div className="cv:flex cv:items-center cv:gap-2">
				<SlotItems items={end} />
				<Corner items={cornersEnd} />
			</div>
		</div>
	);
}
