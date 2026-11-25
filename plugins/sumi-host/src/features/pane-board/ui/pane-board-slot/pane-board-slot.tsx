import { createElement as h } from "react";
import type { ReactNode } from "react";
import { PluginSlot } from "@widgetarium/plugin-framework/react";
import type { PaneBoardProps } from "../../lib/pane-board-props.js";

export function PaneBoardSlot({ drawn, chatPx, bounds, onChatPx }: PaneBoardProps): ReactNode {
	return <PluginSlot name="sumi-host.pane-board" props={{ drawn, chatPx, bounds, onChatPx }} />;
}
