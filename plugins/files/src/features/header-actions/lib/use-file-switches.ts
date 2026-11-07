import { FileSwitchesQuery } from "@sumi/file-page";
import type { FileSwitch } from "@sumi/file-page";
import { useQuery } from "@widgetarium/data-framework";

export interface FileSwitches {
	readonly isOn: (name: FileSwitch) => boolean;
	readonly loads: number;
}

export function useFileSwitches(): FileSwitches {
	const { on, loads } = useQuery(FileSwitchesQuery).data;
	return {
		isOn: (name) => on.includes(name),
		loads,
	};
}
