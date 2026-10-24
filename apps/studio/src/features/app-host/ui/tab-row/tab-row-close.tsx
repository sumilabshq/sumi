import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";

export interface TabRowCloseProps {
	readonly title: string;
	readonly tabId: string;
	readonly onClose: () => void;
}

const CLOSE_TAB = "Close {title}";
const CLOSE =
	"cv:ms-auto cv:hidden cv:group-hover/row:inline-flex cv:group-data-[shown]/row:inline-flex cv:focus-visible:inline-flex cv:size-[18px] cv:flex-none cv:cursor-pointer cv:items-center cv:justify-center cv:[font:inherit] cv:border-0 cv:p-0 cv:text-(--sumi-text) cv:outline-none cv:opacity-0 cv:[transition:opacity_var(--sumi-dur-hover)_var(--sumi-ease),transform_var(--wg-press)_var(--wg-ease)] cv:group-hover/row:opacity-45 cv:group-hover/row:[transition:opacity_0ms,transform_var(--wg-press)_var(--wg-ease)] cv:group-data-[shown]/row:opacity-45 cv:hover:!opacity-100 cv:focus-visible:opacity-100";

export function TabRowClose({ title, tabId, onClose }: TabRowCloseProps): ReactElement {
	const said = CLOSE_TAB.replace("{title}", title);
	return (
		<IconButton
			variant="ghost"
			className={CLOSE}
			label={said}
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event: MouseEvent) => {
				event.stopPropagation();
				onClose();
			}}
			data-host-close-tab={tabId}
		>
			<Icon name="x" size={12} />
		</IconButton>
	);
}
