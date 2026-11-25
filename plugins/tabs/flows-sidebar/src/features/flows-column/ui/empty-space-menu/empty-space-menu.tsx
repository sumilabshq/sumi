import { createElement as h, useState } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Icon, PopoverItem, SpotMenu } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";
import { NEW_SESSION, newSessionPlaceOf } from "../../../../shared/lib/flow-facts.js";
import type { FlowsSidebarFacts } from "../../../../shared/lib/flow-facts.js";
import { requestProjectDraft } from "../../../../shared/lib/project-draft-request.js";
import { usePeekHold } from "../../../../shared/lib/peek-hold.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";

const NEW_FOLDER = "New folder";
const NEW_PROJECT = "New project";
const MENU_LABEL = "Sessions";

export interface EmptySpaceMenuProps {
	readonly sidebar: FlowsSidebarFacts;
	readonly acts: FlowActs;
	readonly children: ReactNode;
}

export function EmptySpaceMenu({ sidebar, acts, children }: EmptySpaceMenuProps): ReactElement {
	const [at, setAt] = useState<MenuSpot | null>(null);
	const [wasOpened, setWasOpened] = useState(false);
	usePeekHold(at !== null);
	const open = (event: MouseEvent): void => {
		if (event.defaultPrevented) {
			return;
		}

		event.preventDefault();
		setWasOpened(true);
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
			{wasOpened ? (
				<SpotMenu at={at} onClose={close}>
					{() => (
						<div role="menu" aria-label={MENU_LABEL}>
							<PopoverItem
								role="menuitem"
								icon={<Icon name="square-pen" />}
								onClick={() =>
									pick(() => acts.create(NEW_SESSION, newSessionPlaceOf(sidebar, sidebar.windowProjectId)))
								}
							>
								{NEW_SESSION}
							</PopoverItem>
							<PopoverItem
								role="menuitem"
								icon={<Icon name="folder-plus" />}
								onClick={() => pick(() => acts.createFolder(NEW_FOLDER))}
							>
								{NEW_FOLDER}
							</PopoverItem>
							<PopoverItem
								role="menuitem"
								icon={<Icon name="layers" />}
								onClick={() => pick(() => requestProjectDraft(null))}
							>
								{NEW_PROJECT}
							</PopoverItem>
						</div>
					)}
				</SpotMenu>
			) : null}
		</div>
	);
}
