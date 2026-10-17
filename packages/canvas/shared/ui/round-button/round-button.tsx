import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { TOP_BAR_HEIGHT } from "../../lib/top-bar/top-bar-look.js";
import { Tip } from "../tip/tip.js";

export type RoundTone = "ink" | "raise" | "plate";
export type RoundSize = "l" | "m";

export interface RoundButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type"> {
	readonly label: string;
	readonly tip?: string;
	readonly tone: RoundTone;
	readonly size: RoundSize;
	readonly isBusy?: boolean;
}

const ROUND =
	"cv:grid cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:p-0 cv:shadow-none cv:transition-[background-color,color] cv:duration-150 cv:ease-standard cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring cv:disabled:cursor-default cv:disabled:opacity-50 cv:aria-disabled:cursor-default cv:aria-disabled:opacity-50 cv:aria-busy:motion-safe:animate-canvas-pulse";

const TONE: Readonly<Record<RoundTone, string>> = {
	ink: "cv:bg-primary cv:text-primary-foreground cv:hover:bg-primary/85",
	raise: "cv:bg-raise cv:text-ink cv:hover:bg-raise/70",
	plate: "cv:bg-group cv:text-ink cv:hover:bg-fill-hover",
};

const SIZE: Readonly<Record<RoundSize, string>> = {
	l: `${TOP_BAR_HEIGHT} cv:w-12`,
	m: "cv:size-9",
};

// TRADE-OFF: not the kit IconButton, it paints its fill on ::before
export function RoundButton({
	label,
	tip = label,
	tone,
	size,
	isBusy = false,
	children,
	...rest
}: RoundButtonProps): ReactElement {
	return (
		<Tip label={tip}>
			<button
				type="button"
				aria-label={label}
				aria-busy={isBusy || undefined}
				className={`${ROUND} ${TONE[tone]} ${SIZE[size]}`}
				{...rest}
			>
				{children}
			</button>
		</Tip>
	);
}
