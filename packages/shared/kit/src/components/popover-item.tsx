import { createElement as h, useState } from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface PopoverItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly checked?: boolean | undefined;
	readonly sub?: ReactNode;
	readonly icon?: ReactNode;
	readonly keys?: ReactNode;
}

export function PopoverItem({ checked, sub, icon, keys, children, ...rest }: PopoverItemProps): ReactElement {
	const [isHighlighted, setHighlighted] = useState(false);
	return (
		<button
			type="button"
			{...rest}
			aria-checked={checked}
			data-state={checkedStateOf(checked)}
			data-highlighted={isHighlighted ? "" : undefined}
			data-disabled={rest.disabled ? "" : undefined}
			onFocus={(event) => {
				setHighlighted(true);
				rest.onFocus?.(event);
			}}
			onBlur={(event) => {
				setHighlighted(false);
				rest.onBlur?.(event);
			}}
			onPointerEnter={(event) => {
				setHighlighted(true);
				rest.onPointerEnter?.(event);
			}}
			onPointerLeave={(event) => {
				setHighlighted(false);
				rest.onPointerLeave?.(event);
			}}
			className={cn("wg-kit-pop-item", Boolean(sub) && "is-two", rest.className)}
		>
			{icon === undefined ? null : <span className="wg-kit-pop-icon">{icon}</span>}
			{saidOf(children, sub, icon !== undefined || keys !== undefined)}
			{keys === undefined ? null : <span className="wg-kit-menu-shortcut">{keys}</span>}
			{checked === undefined ? null : <Icon name="tick" className="wg-kit-pop-tick" />}
		</button>
	);
}

function saidOf(children: ReactNode, sub: ReactNode, hasSlots: boolean): ReactNode {
	if (sub !== undefined) {
		return (
			<span className="wg-kit-pop-said">
				{children}
				<span className="wg-kit-pop-sub" key="sub">
					{sub}
				</span>
			</span>
		);
	}

	if (hasSlots) return <span className="wg-kit-pop-label">{children}</span>;
	return children;
}

function checkedStateOf(checked: boolean | undefined): "checked" | "unchecked" | undefined {
	if (checked === undefined) return undefined;
	return checked ? "checked" : "unchecked";
}
