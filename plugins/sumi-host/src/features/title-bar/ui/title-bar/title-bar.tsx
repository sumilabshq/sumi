import { createElement as h } from "react";
import type { ReactNode } from "react";
import { ControlSpace } from "@widgetarium/kit";
import { ListPluginSlot } from "@widgetarium/plugin-framework/react";

export function TitleBar(): ReactNode {
	return (
		<div className="sumi-title-bar wg-root" data-title-bar="">
			<ControlSpace side="start" className="sumi-title-bar-start" />
			<div className="sumi-title-bar-tabs">
				<ListPluginSlot name="sumi-host.title-tabs" props={{}} />
			</div>
			<TitleEnd />
		</div>
	);
}

export function TitleEnd(): ReactNode {
	return (
		<ControlSpace side="end" className="sumi-title-bar-end">
			<ListPluginSlot name="sumi-host.title-end" props={{}} />
		</ControlSpace>
	);
}
