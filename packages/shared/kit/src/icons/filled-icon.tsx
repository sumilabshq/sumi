import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { filledIconBodyOf } from "./filled-icon-drawings";
import { FILLED_ICON_VIEW_BOX } from "./filled-icon-table";

export interface FilledIconProps {
	readonly name: string;
	readonly size?: number | string;
	readonly className?: string | undefined;
}

const FILLED_ICON_PX = 16;

export function FilledIcon({ name, size = FILLED_ICON_PX, className: cls }: FilledIconProps): ReactElement | null {
	const body = filledIconBodyOf(name);
	const markup = useMemo(() => ({ __html: body ?? "" }), [body]);
	if (body === null) {
		return null;
	}

	return (
		<svg
			className={cn("wg-kit-filled-icon", cls)}
			viewBox={FILLED_ICON_VIEW_BOX}
			width={size}
			height={size}
			fill="currentColor"
			aria-hidden="true"
			dangerouslySetInnerHTML={markup}
		/>
	);
}
