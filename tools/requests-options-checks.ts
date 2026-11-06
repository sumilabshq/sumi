import {
	HasPermissionGuard,
	MemoryRateLimits,
	RateLimitMiddleware,
	middleware,
	minutes,
	permission,
} from "../packages/shared/data-framework/src/index.ts";
import type { Answer, Step, StepCall } from "../packages/shared/data-framework/src/index.ts";
import { check } from "./check-helpers.ts";

const EditPages = permission("pages.edit");
const RemovePages = permission("pages.remove");
const PASSED_ANSWER: Answer<unknown> = { ok: true, output: "passed", invalidated: [] };
const passingNext = (): Promise<Answer<unknown>> => Promise.resolve(PASSED_ANSWER);
const optionsSeen: unknown[] = [];

const OptionsRecordingMiddleware = middleware()
	.options<[label?: string]>()
	.handle(({ options }, _injected, next) => {
		optionsSeen.push(options);
		return next();
	});

function stepCallHolding(permissions: readonly string[]): StepCall {
	return {
		request: "pages/rename",
		input: undefined,
		context: { user: { id: "editor", permissions: permissions.map(permission) } },
	};
}

const NOTHING_INJECTED = {};

function isStepHandle(value: unknown): value is Step["handle"] {
	return typeof value === "function";
}
const EditAndRemovePagesGuard = HasPermissionGuard(EditPages, RemovePages);

check(
	"a guard given two permissions passes a user holding both",
	(await EditAndRemovePagesGuard.handle(stepCallHolding(["pages.edit", "pages.remove"]), NOTHING_INJECTED, passingNext))
		.ok,
	true,
);

const missingOne = await EditAndRemovePagesGuard.handle(stepCallHolding(["pages.edit"]), NOTHING_INJECTED, passingNext);
check(
	"and refuses a user missing one of them, naming the missing permission",
	missingOne.ok ? "passed" : [missingOne.code, missingOne.reason],
	["forbidden", "pages/rename needs the permission pages.remove"],
);

const bareHandle: unknown = Reflect.get(HasPermissionGuard, "handle");
const bareAnswer = isStepHandle(bareHandle)
	? await bareHandle(stepCallHolding(["pages.edit"]), NOTHING_INJECTED, passingNext)
	: null;
check(
	"a permission guard reached bare, past the types, refuses instead of passing everyone",
	bareAnswer === null || bareAnswer.ok ? "passed" : bareAnswer.code,
	"forbidden",
);

const OncePerMinuteMiddleware = RateLimitMiddleware({ calls: 1, per: minutes(1) });
const injectedRateLimits = { rateLimits: new MemoryRateLimits(() => 0) };
const limitedAnswers = [
	await OncePerMinuteMiddleware.handle(stepCallHolding([]), injectedRateLimits, passingNext),
	await OncePerMinuteMiddleware.handle(stepCallHolding([]), injectedRateLimits, passingNext),
];
check(
	"a rate limit middleware reads the limit it was called with",
	limitedAnswers.map((answer) => (answer.ok ? "ok" : answer.code)),
	["ok", "rate-limited"],
);

await OptionsRecordingMiddleware.handle(stepCallHolding([]), NOTHING_INJECTED, passingNext);
await OptionsRecordingMiddleware("timed").handle(stepCallHolding([]), NOTHING_INJECTED, passingNext);
check("a step with optional options runs bare with none, and called with the ones given", optionsSeen, [[], ["timed"]]);
