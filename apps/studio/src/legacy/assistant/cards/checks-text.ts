import type { Tally } from "@widgetarium/core/engine/assistant-cards.js";
import { countText } from "@widgetarium/core/engine/count-text.js";

const CHECKS_PASSED_ONE = "1 check passed";
const CHECKS_PASSED_MANY = "{count} checks passed";
const CHECKS_FAILED = "{failed} of {all} checks failed";

export function checksText(checks: Tally): string {
	const failed = checks.all - checks.passed;
	if (failed > 0) {
		return CHECKS_FAILED.replace("{failed}", String(failed)).replace("{all}", String(checks.all));
	}

	return countText(checks.passed, CHECKS_PASSED_ONE, CHECKS_PASSED_MANY);
}
