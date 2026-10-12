import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { Button, Icon, Popover, PopoverItem, Segmented } from "@widgetarium/kit";

export interface CanvasTab {
	readonly value: string;
	readonly label: ReactNode;
}

export interface TopBarProps {
	readonly barRef: RefObject<HTMLDivElement | null>;
	readonly head: ReactNode;
	readonly leading: readonly CanvasTab[];
	readonly pages: readonly CanvasTab[];
	readonly trailing: readonly CanvasTab[];
	readonly page: string;
	readonly onPage: (page: string) => void;
	readonly onReturn: () => void;
	readonly start: ReactNode;
	readonly end: ReactNode;
	readonly hasCorners: boolean;
}

const PAGES_TAB = "\u0000pages";
const PAGES = "Pages";
const RETURN = "Back to view";
const BAR =
	"cv:pointer-events-none cv:absolute cv:inset-x-0 cv:top-0 cv:z-[2] cv:flex cv:flex-row cv:items-center cv:justify-between cv:gap-4 cv:pb-10 cv:before:absolute cv:before:inset-0 cv:before:backdrop-blur-[14px] cv:before:content-[''] cv:before:[mask-image:linear-gradient(to_bottom,black_45%,transparent)] cv:*:pointer-events-auto cv:*:relative";
const SWITCH =
	"cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)] cv:[&_.wg-kit-anchor]:flex cv:[&_.wg-kit-anchor]:h-full cv:[&_button]:h-[calc(var(--wg-kit-control-s)-4px)] cv:[&_button:has([data-canvas-pages-trigger])]:p-0";

export function TopBar(props: TopBarProps): ReactElement {
	const { leading, pages, trailing, page, onPage } = props;
	const [isPicking, setIsPicking] = useState(false);
	const [asked, setAsked] = useState<string | null>(null);
	useEffect(() => setAsked(null), [page]);
	const picked = useRef<string | null>(null);
	const turnToPicked = (): void => {
		const next = picked.current;
		picked.current = null;
		if (next !== null) onPage(next);
	};
	const pagesTab: CanvasTab = {
		value: PAGES_TAB,
		label: (
			<Popover
				trigger={
					<span className="cv:inline-flex cv:h-full cv:items-center cv:gap-1 cv:px-2" data-canvas-pages-trigger="">
						{PAGES}
						<Icon name="chevron-down" size={14} />
					</span>
				}
				open={isPicking}
				onOpenChange={setIsPicking}
				onExited={turnToPicked}
				placement="below"
				isPortaled
				className="cv:[&_.wg-kit-pop-inner]:max-h-[320px] cv:[&_.wg-kit-pop-inner]:overflow-y-auto"
			>
				{pages.map((one) => (
					<PopoverItem
						key={one.value}
						checked={one.value === page}
						onClick={() => {
							picked.current = one.value;
							setIsPicking(false);
						}}
					>
						{one.label}
					</PopoverItem>
				))}
			</Popover>
		),
	};
	const isOnPage = pages.some((one) => one.value === page);
	return (
		<div className={props.hasCorners ? BAR : `${BAR} cv:px-4 cv:pt-4`} ref={props.barRef} data-canvas-topbar="">
			<div className="cv:flex cv:min-w-0 cv:items-center cv:gap-2">
				{props.start}
				{props.head}
			</div>
			<div className="cv:flex cv:items-center cv:gap-2">
				<span className="cv:inline-flex" data-canvas-page-switch="">
					<Segmented<string>
						items={[...leading, ...(pages.length > 0 ? [pagesTab] : []), ...trailing]}
						value={asked ?? (isOnPage ? PAGES_TAB : page)}
						onValueChange={(next) => {
							if (next === PAGES_TAB) return;
							setAsked(next);
							onPage(next);
						}}
						size="s"
						className={SWITCH}
					/>
				</span>
				<Button size="s" variant="tinted" onClick={props.onReturn}>
					{RETURN}
				</Button>
				{props.end}
			</div>
		</div>
	);
}
