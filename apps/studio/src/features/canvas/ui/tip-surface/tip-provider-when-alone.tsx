import { Fragment, createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { Tooltip } from "radix-ui";
import { IsUnderTipSurface } from "../../lib/is-under-tip-surface.js";
import type { TipSurfaceProps } from "./tip-surface.js";

export function TipProviderWhenAlone({ children }: TipSurfaceProps): ReactElement {
	return useContext(IsUnderTipSurface) ? <>{children}</> : <Tooltip.Provider>{children}</Tooltip.Provider>;
}
