import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";

export interface GpuViewProps {
	readonly className?: string;
	readonly onPress?: () => void;
	readonly children?: ReactNode;
}

export function GpuView(props: GpuViewProps): ReactElement {
	return createElement("View", props);
}
