import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { HeaderActionsProps } from "@sumi/sumi-host-plugin";
import { PlateHeaderPart } from "../../../plate/ui/plate-header/plate-header-part.js";

export function PageHeaderActions({ children }: HeaderActionsProps): ReactElement {
	return <PlateHeaderPart place="controls">{children}</PlateHeaderPart>;
}
