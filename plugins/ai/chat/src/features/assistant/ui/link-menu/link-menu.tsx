import { createElement as h, useEffect, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import { useCommand } from "@widgetarium/data-framework";
import { Icon, PopoverItem, SpotMenu } from "@widgetarium/kit";
import type { MenuSpot } from "@widgetarium/kit";

export interface LinkMenuProps {
	readonly root: RefObject<HTMLElement | null>;
	readonly chatId: string | undefined;
}

interface PressedLink {
	readonly href: string;
	readonly at: MenuSpot;
}

const OPENABLE_LINK = 'a[href^="sumi:"], a[href^="http:"], a[href^="https:"]';
const MENU_LABEL = "Link";

export function LinkMenu({ root, chatId }: LinkMenuProps): ReactElement | null {
	const [pressed, setPressed] = useState<PressedLink | null>(null);
	const { run: openLink } = useCommand(appHost.links.openLink);
	useOpensOnLinkRightClick(root, setPressed);

	if (pressed === null) {
		return null;
	}

	const close = (): void => setPressed(null);
	const open = (place: "beside" | "split"): void => {
		void openLink({ href: pressed.href, home: chatId ?? null, place });
	};
	return (
		<SpotMenu at={pressed.at} onClose={close}>
			{() => (
				<div role="menu" aria-label={MENU_LABEL}>
					<LinkMenuItem label="Open" icon="square-arrow-out-up-right" onSelect={() => open("beside")} onClose={close} />
					<LinkMenuItem label="Open in split" icon="square-split-horizontal" onSelect={() => open("split")} onClose={close} />
					<LinkMenuItem
						label="Copy link"
						icon="copy"
						onSelect={() => void navigator.clipboard.writeText(pressed.href)}
						onClose={close}
					/>
				</div>
			)}
		</SpotMenu>
	);
}

interface LinkMenuItemProps {
	readonly label: string;
	readonly icon: string;
	readonly onSelect: () => void;
	readonly onClose: () => void;
}

function LinkMenuItem({ label, icon, onSelect, onClose }: LinkMenuItemProps): ReactElement {
	return (
		<PopoverItem
			role="menuitem"
			icon={<Icon name={icon} />}
			onClick={() => {
				onClose();
				onSelect();
			}}
		>
			{label}
		</PopoverItem>
	);
}

function useOpensOnLinkRightClick(root: RefObject<HTMLElement | null>, setPressed: (link: PressedLink) => void): void {
	useEffect(() => {
		const holder = root.current;

		if (holder === null) {
			return;
		}

		const pressed = (event: MouseEvent): void => {
			const anchor = event.target instanceof Element ? event.target.closest(OPENABLE_LINK) : null;
			const href = anchor?.getAttribute("href") ?? "";

			if (href === "") {
				return;
			}

			event.preventDefault();
			setPressed({ href, at: { x: event.clientX, y: event.clientY } });
		};
		holder.addEventListener("contextmenu", pressed);
		return () => holder.removeEventListener("contextmenu", pressed);
	}, [root, setPressed]);
}
