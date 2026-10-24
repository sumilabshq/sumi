import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { TOP_BAR_HEIGHT } from "../../lib/top-bar-look.js";
import { useTopBarLook } from "../../lib/top-bar-look-context.js";
import { Tip } from "../tip/tip.js";
import { HeaderRoundButton } from "./header-round-button.js";

export type RoundTone = "ink" | "raise" | "plate";
export type RoundSize = "l" | "m";

export interface RoundButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type"> {
	readonly label: string;
	readonly tip?: string;
	readonly tone: RoundTone;
	readonly size: RoundSize;
	readonly isBusy?: boolean;
}

const BUTTON =
	"cv:grid cv:flex-none cv:cursor-pointer cv:place-items-center cv:border-0 cv:p-0 cv:shadow-none cv:focus-visible:outline-2 cv:disabled:cursor-default cv:disabled:opacity-50 cv:aria-disabled:cursor-default cv:aria-disabled:opacity-50 cv:aria-busy:motion-safe:animate-canvas-pulse";

const ROUND =
	"cv:rounded-full cv:transition-[background-color,color] cv:duration-150 cv:ease-standard cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

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
	if (useTopBarLook() === "ghost") {
		return <HeaderRoundButton label={label} tip={tip} isBusy={isBusy} face={children} {...rest} />;
	}

	return (
		<Tip label={tip}>
			<button
				type="button"
				aria-label={label}
				aria-busy={isBusy || undefined}
				className={`${BUTTON} ${ROUND} ${TONE[tone]} ${SIZE[size]}`}
				{...rest}
			>
				{children}
			</button>
		</Tip>
	);
}
