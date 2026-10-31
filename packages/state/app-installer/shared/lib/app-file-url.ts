import type { AppVersion } from "../schema/installed.schema.js";

export type AppFileUrlOf = (installed: AppVersion, file: string) => string;

export function appFileUrlOf({ id, version }: AppVersion, file: string): string {
	return `sumi-app://${id}/${version}/${file}`;
}
