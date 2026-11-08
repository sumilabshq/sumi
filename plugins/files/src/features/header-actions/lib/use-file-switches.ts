import { filePage } from "@sumi/file-page/contract";
import type { FileSwitch } from "@sumi/file-page/contract";
import { useQuery } from "@widgetarium/data-framework";

export interface FileSwitches {
	readonly isOn: (name: FileSwitch) => boolean;
	readonly loads: number;
}

export function useFileSwitches(): FileSwitches {
	const { on, loads } = useQuery(filePage.switches.all).data;
	return {
		isOn: (name) => on.includes(name),
		loads,
	};
}
