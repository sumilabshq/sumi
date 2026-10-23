import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { AppProvider } from "@widgetarium/core/requests";
import { ShellAppContext } from "../../../../shared/lib/shell-app-context.js";
import type { FrameSide } from "../../../../shared/schema/frame-sides.schema.js";
import { SideToggleButton } from "./side-toggle-button.js";

export interface FrameSideToggleProps {
	readonly side: FrameSide;
}

export function FrameSideToggle({ side }: FrameSideToggleProps): ReactElement {
	const shellApp = useContext(ShellAppContext);

	if (shellApp === null) {
		return <SideToggleButton side={side} />;
	}

	return (
		<AppProvider app={shellApp}>
			<SideToggleButton side={side} />
		</AppProvider>
	);
}
