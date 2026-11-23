import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { useTopBarLook } from "../../lib/top-bar-look-context.js";
import { Tip } from "../tip/tip.js";
import { HeaderRoundButton } from "./header-round-button.js";

export type RoundTone = "ink" | "raise" | "plate";
export type RoundSize = "l" | "m";

export interface RoundButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "form" | "type"> {
	readonly label: string;
	readonly tip?: string;
	readonly tone: RoundTone;
	readonly size: RoundSize;
	readonly isBusy?: boolean;
}

const LOOK = {
	ink: { emphasis: "solid" },
	raise: { emphasis: "raised" },
	plate: { emphasis: "soft" },
} as const;

const SIZE: Readonly<Record<RoundSize, "lg" | "sm">> = {
	l: "lg",
	m: "sm",
};

const BUSY = "cv:aria-busy:motion-safe:animate-canvas-pulse";

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
			<Button
				shape="square"
				{...LOOK[tone]}
				size={SIZE[size]}
				label={label}
				aria-busy={isBusy || undefined}
				className={BUSY}
				{...rest}
			>
				{children}
			</Button>
		</Tip>
	);
}
