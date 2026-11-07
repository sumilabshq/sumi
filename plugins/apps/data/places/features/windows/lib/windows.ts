import type { MoveWindows } from "../../../shared/schema/windows.schema.js";

export function openWindow(label: string, at: number): MoveWindows {
	return ({ windows }) => {
		if (windows.some((open) => open.label === label)) {
			return null;
		}

		return {
			windows: { windows: [...windows, { label, openedAt: at }] },
			reason: `windows ${windows.length} → ${windows.length + 1} (${label} opened)`,
		};
	};
}

export function keepWindows(live: readonly string[]): MoveWindows {
	return ({ windows }) => {
		const gone = windows.filter((open) => !live.includes(open.label));

		if (gone.length === 0) {
			return null;
		}

		return {
			windows: { windows: windows.filter((open) => live.includes(open.label)) },
			reason: `windows ${windows.length} → ${windows.length - gone.length} (${gone.map((open) => open.label).join(", ")} no longer open)`,
		};
	};
}

export function closeWindow(label: string): MoveWindows {
	return ({ windows }) => {
		if (!windows.some((open) => open.label === label)) {
			return null;
		}

		return {
			windows: { windows: windows.filter((open) => open.label !== label) },
			reason: `windows ${windows.length} → ${windows.length - 1} (${label} closed)`,
		};
	};
}
