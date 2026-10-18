import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { Permit, PermitKind } from "../../contract.js";

const ICON_OF: Readonly<Record<PermitKind, string>> = {
	files: "file",
	network: "globe",
	ink: "eye",
};
const CHIP =
	"cv:inline-flex cv:h-6 cv:flex-none cv:items-center cv:gap-[5px] cv:whitespace-nowrap cv:rounded-full cv:bg-fill cv:px-[9px] cv:text-xs cv:text-muted-foreground";
const SCOPE = "cv:ms-px cv:text-muted-foreground/65";

export function PermitChip({ permit }: { readonly permit: Permit }): ReactElement {
	return (
		<span className={CHIP} data-host-picker-chip={permit.kind}>
			<Icon name={ICON_OF[permit.kind]} size={12} className="cv:flex-none" />
			{permit.label}
			<span className={SCOPE}>{permit.scope}</span>
		</span>
	);
}
