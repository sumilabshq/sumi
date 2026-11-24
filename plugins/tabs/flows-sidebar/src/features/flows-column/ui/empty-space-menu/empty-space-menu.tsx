import { createElement as h, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Icon, PopoverItem, SpotMenu } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";
import type { FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import { usePeekHold } from "../../../../shared/lib/peek-hold.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";

const NEW_FLOW = "New flow";
const NEW_FOLDER = "New folder";
const MENU_LABEL = "Flows";

export interface EmptySpaceMenuProps {
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly children: ReactNode;
}

export function EmptySpaceMenu({ sidebar, acts, children }: EmptySpaceMenuProps): ReactElement {
	const [at, setAt] = useState<MenuSpot | null>(null);
	usePeekHold(at !== null);
	const open = (event: MouseEvent): void => {
		if (event.defaultPrevented) {
			return;
		}

		event.preventDefault();
		setAt({ x: event.clientX, y: event.clientY });
	};
	const close = (): void => setAt(null);
	const pick = (act: () => void): void => {
		close();
		act();
	};

	return (
		<div className="sumi-flows" onContextMenu={open}>
			{children}
			<SpotMenu at={at} onClose={close}>
				{() => (
					<div role="menu" aria-label={MENU_LABEL}>
						<PopoverItem
							role="menuitem"
							icon={<Icon name="square-pen" />}
							onClick={() => pick(() => acts.create(NEW_FLOW, { folderId: null, before: sidebar.looseFlows[0]?.id ?? null }))}
						>
							{NEW_FLOW}
						</PopoverItem>
						<PopoverItem role="menuitem" icon={<Icon name="folder-plus" />} onClick={() => pick(() => acts.createFolder(NEW_FOLDER))}>
							{NEW_FOLDER}
						</PopoverItem>
					</div>
				)}
			</SpotMenu>
		</div>
	);
}
