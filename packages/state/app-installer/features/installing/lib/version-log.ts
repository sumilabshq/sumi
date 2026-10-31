import type { AppVersion, VersionMove } from "../../../shared/schema/installed.schema.js";

export function logMove(moved: AppVersion, move: VersionMove, why: string): void {
	const { was, now } = move;
	console.info(
		`[widgetarium] app ${moved.id} current ${was.current ?? "none"} → ${now.current ?? "none"}, failed [${was.failed.join(", ")}] → [${now.failed.join(", ")}] (${moved.version} ${why})`,
	);
}
