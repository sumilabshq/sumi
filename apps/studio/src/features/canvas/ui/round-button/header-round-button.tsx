import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { IconButton } from "@widgetarium/kit";
import { Tip } from "../tip/tip.js";
import type { RoundButtonProps } from "./round-button.js";

export interface HeaderRoundButtonProps extends Omit<
	RoundButtonProps,
	"tone" | "size" | "tip" | "isBusy" | "children"
> {
	readonly tip: string;
	readonly isBusy: boolean;
	readonly face: ReactNode;
}

const HEADER_BUTTON = "wg-plate-button";

export function HeaderRoundButton({ label, tip, isBusy, face, ...rest }: HeaderRoundButtonProps): ReactElement {
	return (
		<Tip label={tip}>
			<IconButton variant="ghost" size="xs" className={HEADER_BUTTON} label={label} isLoading={isBusy} {...rest}>
				{face}
			</IconButton>
		</Tip>
	);
}
