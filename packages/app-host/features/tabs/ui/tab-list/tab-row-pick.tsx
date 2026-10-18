import { createElement as h } from "react";
import type { PointerEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AppTabState } from "../../../../shared/schema/app-tab.schema.js";
import { TabIcon } from "../../../../shared/ui/tab-face/tab-icon.js";
import { TabWords } from "../../../../shared/ui/tab-face/tab-words.js";

export interface TabRowPickProps {
	readonly tab: AppTabState;
	readonly className: string;
	readonly onPointerDown: (event: PointerEvent) => void;
	readonly onShow: () => void;
}

const GRIP =
	"cv:pointer-events-none cv:absolute cv:inset-y-0 cv:start-1.5 cv:hidden cv:w-3.5 cv:items-center cv:justify-center cv:text-[var(--wg-studio-tabs-faint)] cv:group-hover:flex cv:group-data-[lifted]:flex";

export function TabRowPick({ tab, className, onPointerDown, onShow }: TabRowPickProps): ReactElement {
	return (
		<button
			type="button"
			aria-current={tab.isShown || undefined}
			className={className}
			onPointerDown={onPointerDown}
			onClick={onShow}
		>
			<span aria-hidden="true" className={GRIP} data-host-tab-grip="">
				<Icon name="grip-vertical" size={14} />
			</span>
			<TabIcon tab={tab} look="row" />
			<TabWords tab={tab} />
		</button>
	);
}
