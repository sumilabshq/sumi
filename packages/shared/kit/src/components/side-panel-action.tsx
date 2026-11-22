import { createElement as h } from "react";
import type { ReactElement } from "react";
import { IconButton } from "./icon-button";
import type { IconButtonProps } from "./icon-button";

export function SidePanelAction(props: IconButtonProps): ReactElement {
	return <IconButton variant="ghost" size="xs" {...props} />;
}
