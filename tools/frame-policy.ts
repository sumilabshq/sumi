import { readFileSync } from "node:fs";

const FRAME_POLICY_TEMPLATE = readFileSync("apps/host-tauri/src-tauri/src/app_pages/frame-policy.txt", "utf8").trim();
const APP_SOURCE = "sumi-app://{app}";

export function framePolicyServedFrom(app: string, origin: string): string {
	return FRAME_POLICY_TEMPLATE.replaceAll("{app}", app).replaceAll(APP_SOURCE.replace("{app}", app), origin);
}
