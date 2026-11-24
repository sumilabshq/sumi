import { createElement as h, Fragment } from "react";
import type { MouseEvent, PointerEvent, ReactElement } from "react";
import { useTabFace } from "@sumi/sumi-host-plugin";
import { Icon } from "@widgetarium/kit";
import type { FlowTab } from "../../../../shared/lib/flow-board-types.js";
import { TAB_ATTRIBUTE } from "../../../../shared/lib/pane-dom.js";
import { tabLabelOf } from "../../lib/tab-look.js";
import { RenameField } from "../rename-field/rename-field.js";

export interface PaneTabProps {
	readonly tab: FlowTab;
	readonly art: string;
	readonly isActive: boolean;
	readonly isLabelled: boolean;
	readonly isRenaming: boolean;
	readonly isLifted: boolean;
	readonly onShow: () => void;
	readonly onClose: () => void;
	readonly onMenu: (event: MouseEvent<HTMLElement>) => void;
	readonly onPress: (event: PointerEvent<HTMLElement>) => void;
	readonly onRenameStart: () => void;
	readonly onRenamed: (label: string | null) => void;
}

const STATUS_SAID: Readonly<Record<string, string>> = {
	asking: "Waiting for you",
	failed: "Failed",
	unread: "Done, not read",
};

export function PaneTab(props: PaneTabProps): ReactElement {
	const { tab, isActive, isLabelled, isLifted } = props;
	const label = tabLabelOf(tab);
	return (
		<div
			{...{ [TAB_ATTRIBUTE]: tab.id }}
			className="sumi-pane-tab"
			role="tab"
			tabIndex={isActive ? 0 : -1}
			aria-selected={isActive}
			aria-label={label}
			title={isLabelled ? undefined : label}
			data-active={isActive ? "" : undefined}
			data-mode={isLabelled ? "label" : "icon"}
			data-lifted={isLifted ? "" : undefined}
			onClick={props.onShow}
			onContextMenu={props.onMenu}
			onDoubleClick={props.onRenameStart}
			onPointerDown={props.onPress}
			onKeyDown={(event) => event.key === "Enter" && props.onShow()}
		>
			<TabFaceSlot tab={tab} art={props.art} label={label} />
			{isLabelled ? (
				<TabText label={label} isRenaming={props.isRenaming} onRenamed={props.onRenamed} onClose={props.onClose} />
			) : null}
			<StatusDot mark={tab.mark} />
		</div>
	);
}

function TabFaceSlot({
	tab,
	art,
	label,
}: {
	readonly tab: FlowTab;
	readonly art: string;
	readonly label: string;
}): ReactElement {
	const TabFace = useTabFace();
	return (
		<span className="sumi-pane-tab-face">
			<TabFace art={art} favicon={null} title={label} address={tab.address} mark={tab.mark} />
		</span>
	);
}

interface TabTextProps {
	readonly label: string;
	readonly isRenaming: boolean;
	readonly onRenamed: (label: string | null) => void;
	readonly onClose: () => void;
}

function TabText({ label, isRenaming, onRenamed, onClose }: TabTextProps): ReactElement {
	if (isRenaming) {
		return <RenameField initial={label} onDone={onRenamed} />;
	}

	return (
		<>
			<span className="sumi-pane-tab-title">{label}</span>
			<CloseButton onClose={onClose} />
		</>
	);
}

function StatusDot({ mark }: { readonly mark: string }): ReactElement | null {
	const said = STATUS_SAID[mark];
	return said === undefined ? null : (
		<span className="sumi-pane-tab-dot" data-mark={mark} role="img" aria-label={said} />
	);
}

function CloseButton({ onClose }: { readonly onClose: () => void }): ReactElement {
	return (
		<button
			type="button"
			className="sumi-pane-tab-close"
			aria-label="Close tab"
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation();
				onClose();
			}}
		>
			<Icon name="x" size={12} />
		</button>
	);
}
