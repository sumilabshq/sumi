import { createElement } from "react";
import type { ReactElement } from "react";

export interface GpuTextProps {
	readonly className?: string;
	readonly onPress?: () => void;
	readonly children?: string | number | readonly (string | number)[];
}

export function GpuText(props: GpuTextProps): ReactElement {
	return createElement("Text", props);
}
