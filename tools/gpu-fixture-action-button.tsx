import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuIcon, GpuText, GpuView } from "../packages/gpu/index.ts";

export type ActionKind = "ghost" | "outline" | "primary";

interface ActionButtonProps {
	readonly kind: ActionKind;
	readonly icon: string;
	readonly label: string;
	readonly onPress?: () => void;
}

const LOOK: Readonly<Record<ActionKind, string>> = {
	ghost: "hover:bg-muted active:bg-accent text-muted-foreground",
	outline: "border border-border bg-page hover:bg-muted active:bg-accent text-foreground",
	primary: "bg-primary text-primary-foreground",
};

export function ActionButton({ kind, icon, label, onPress = () => {} }: ActionButtonProps): ReactElement {
	return (
		<GpuView className={`flex items-center gap-2 h-8 px-3 rounded-md transition ${LOOK[kind]}`} onPress={onPress}>
			<GpuIcon name={icon} size={16} />
			<GpuText className="text-sm font-medium">{label}</GpuText>
		</GpuView>
	);
}
