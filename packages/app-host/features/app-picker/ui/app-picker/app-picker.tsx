import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Popover } from "@widgetarium/kit";
import type { AppKind } from "../../../../shared/schema/app-tab.schema.js";
import { PickerPanel } from "./picker-panel.js";

export interface AppPickerProps {
	readonly trigger: ReactNode;
	readonly onAdd: (app: AppKind) => void;
}

const PANEL = "wg-host-app-picker";

export function AppPicker({ trigger, onAdd }: AppPickerProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setOpen} placement="below" isPortaled trigger={trigger} className={PANEL}>
			<PickerPanel
				onAdd={(app) => {
					setOpen(false);
					onAdd(app);
				}}
				onBrowse={() => setOpen(false)}
			/>
		</Popover>
	);
}
