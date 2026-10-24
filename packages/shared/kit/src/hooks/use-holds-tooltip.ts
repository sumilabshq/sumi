import { useEffect } from "react";
import type { TooltipPointing } from "../utils/tooltip-pointing";

export function useHoldsTooltip(pointing: TooltipPointing, drawer: symbol): void {
	useEffect(() => pointing.hold(drawer), [pointing, drawer]);
}
