import { createElement as h } from "react";
import type { ReactNode } from "react";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";

export function FrameStart(): ReactNode {
	return <ListPluginSlot name="sumi-host.frame-start" props={{}} />;
}
