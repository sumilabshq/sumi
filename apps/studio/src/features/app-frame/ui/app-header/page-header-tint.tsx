import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { HeaderTintProps } from "@sumi/sumi-host-plugin";
import { PlateTint } from "../../../plate/ui/plate-header/plate-tint.js";

export function PageHeaderTint({ fill }: HeaderTintProps): ReactElement {
	return <PlateTint look={fill === null ? null : { fill }} />;
}
