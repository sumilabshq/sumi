import { createElement as h } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";

export interface StripButtonProps {
	readonly label: string;
	readonly isOutlined?: boolean;
	readonly hasChevron?: boolean;
	readonly isOn: boolean;
	readonly onOpen: (event: MouseEvent<HTMLElement>) => void;
	readonly children: ReactNode;
}

export function StripButton({
	label,
	isOutlined = false,
	hasChevron = true,
	isOn,
	onOpen,
	children,
}: StripButtonProps): ReactElement {
	return (
		<button
			type="button"
			className={`wg-studio-ai-strip-button${isOutlined ? " is-outlined" : ""}${isOn ? " is-on" : ""}`}
			aria-label={label}
			aria-haspopup="menu"
			onClick={onOpen}
		>
			{children}
			{hasChevron ? (
				<span className="wg-studio-ai-chevron">
					<Icon name="chevron-down" size={13} />
				</span>
			) : null}
		</button>
	);
}
