import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "./button";
import type { SquareButtonProps } from "./button";

export function SidePanelAction(props: SquareButtonProps): ReactElement {
	return <Button shape="square" emphasis="ghost" {...props} label={props.label ?? ""} />;
}
