import { createElement } from "react";
import type { ReactElement } from "react";

export interface GpuIconProps {
	readonly name: string;
	readonly size?: number;
	readonly className?: string;
	readonly onPress?: () => void;
}

export function GpuIcon(props: GpuIconProps): ReactElement {
	return createElement("Icon", props);
}
