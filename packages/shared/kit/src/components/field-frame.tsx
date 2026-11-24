import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export type FieldFrameProps = HTMLAttributes<HTMLDivElement>;

export function FieldFrame({ className, ...rest }: FieldFrameProps): ReactElement {
	return <div data-slot="field-frame" {...rest} className={cn("wg-kit-field-frame", className)} />;
}
