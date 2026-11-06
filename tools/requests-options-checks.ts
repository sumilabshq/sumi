import {
	HasPermissionGuard,
	MemoryRateLimits,
	RateLimitMiddleware,
	middleware,
	minutes,
	permission,
} from "../packages/shared/data-framework/src/index.ts";
import type { Answer, StepCall } from "../packages/shared/data-framework/src/index.ts";
import { check } from "./check-helpers.ts";

const EditPages = permission("pages.edit");
const RemovePages = permission("pages.remove");
const PASSED: Answer<unknown> = { ok: true, output: "passed", invalidated: [] };
const passes = (): Promise<Answer<unknown>> => Promise.resolve(PASSED);
const optionsSeen: unknown[] = [];

const LabelledMiddleware = middleware()
	.options<[label?: string]>()
	.handle(({ options }, _injected, next) => {
		optionsSeen.push(options);
		return next();
	});

function callBy(permissions: readonly string[]): StepCall {
	return {
		request: "pages/rename",
		input: undefined,
		context: { user: { id: "editor", permissions: permissions.map(permission) } },
	};
}

const NoInjected = {};
const BothPermissions = HasPermissionGuard(EditPages, RemovePages);

check(
	"a guard given two permissions passes a user holding both",
	(await BothPermissions.handle(callBy(["pages.edit", "pages.remove"]), NoInjected, passes)).ok,
	true,
);

const missingOne = await BothPermissions.handle(callBy(["pages.edit"]), NoInjected, passes);
check(
	"and refuses a user missing one of them, naming the missing permission",
	missingOne.ok ? "passed" : [missingOne.code, missingOne.reason],
	["forbidden", "pages/rename needs the permission pages.remove"],
);

const OncePerMinute = RateLimitMiddleware({ calls: 1, per: minutes(1) });
const limitedBy = { rateLimits: new MemoryRateLimits(() => 0) };
const limitedAnswers = [
	await OncePerMinute.handle(callBy([]), limitedBy, passes),
	await OncePerMinute.handle(callBy([]), limitedBy, passes),
];
check(
	"a rate limit middleware reads the limit it was called with",
	limitedAnswers.map((answer) => (answer.ok ? "ok" : answer.code)),
	["ok", "rate-limited"],
);

await LabelledMiddleware.handle(callBy([]), NoInjected, passes);
await LabelledMiddleware("timed").handle(callBy([]), NoInjected, passes);
check("a step with optional options runs bare with none, and called with the ones given", optionsSeen, [[], ["timed"]]);
