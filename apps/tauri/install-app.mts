import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const BUILT = "src-tauri/target/release/bundle/macos/Sumi.app";
const INSTALLED = "/Applications/Sumi.app";

if (!existsSync(BUILT)) {
	console.error(`[install] no build at ${BUILT}: run npm run build first`);
	process.exit(1);
}

rmSync(INSTALLED, {
	recursive: true,
	force: true,
});
execFileSync("ditto", [BUILT, INSTALLED]);
console.info(`[install] ${INSTALLED} replaced by ${BUILT}; quit and reopen Sumi to run it`);
