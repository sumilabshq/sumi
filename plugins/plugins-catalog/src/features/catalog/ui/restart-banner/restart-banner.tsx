import { createElement as h } from "react";
import type { ReactElement } from "react";

// TODO: restart command
const RESTART = "Restart Sumi to apply";

export function RestartBanner({ isNeeded }: { readonly isNeeded: boolean }): ReactElement | null {
	return isNeeded ? <p className="sumi-plugins-banner">{RESTART}</p> : null;
}
