import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Popover } from "@widgetarium/kit";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";
import { PickerPanel } from "./picker-panel.js";

export interface AppPickerProps {
	readonly trigger: ReactNode;
	readonly onAdd: (app: AppKind) => void;
}

const PANEL = [
	"cv:w-[580px] cv:max-w-[calc(100vw-16px)] cv:rounded-[34px] cv:bg-raise",
	"cv:shadow-[0_0_0_1px_var(--border),0_24px_64px_color-mix(in_srgb,var(--foreground)_14%,transparent)]",
	"cv:[.theme-dark_&]:shadow-[0_0_0_1px_var(--border),0_24px_64px_color-mix(in_srgb,var(--background)_60%,transparent)]",
	"cv:[&>.wg-kit-pop-inner]:p-2",
].join(" ");

export function AppPicker({ trigger, onAdd }: AppPickerProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} placement="below" isPortaled trigger={trigger} className={PANEL}>
			<PickerPanel
				onAdd={(app) => {
					setOpen(false);
					onAdd(app);
				}}
			/>
		</Popover>
	);
}
