import { QueryStore } from "../packages/core/src/mediator/query-store.ts";
import type { AnyRequest, CommandAnswer, OutputOf, SendOptions, SentOf } from "../packages/core/src/mediator/index.ts";
import { check } from "./mediator-check.ts";
import { Bump, GetPages } from "./mediator-fixture.ts";

class ScriptedSender {
	readonly pending = new Array<(answer: CommandAnswer<unknown>) => void>();

	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	send(): Promise<CommandAnswer<unknown>> {
		return new Promise((settle) => this.pending.push(settle));
	}

	answer(index: number, answer: CommandAnswer<unknown>): Promise<void> {
		this.pending[index]?.(answer);
		return new Promise((settled) => setTimeout(settled, 0));
	}
}

const DONE: CommandAnswer<unknown> = { ok: true, output: undefined };
const input = { prefix: "" };

const racing = new ScriptedSender();
const raced = new QueryStore(racing);
const key = raced.keyOf(GetPages, input);
raced.start(GetPages, input);
await racing.answer(0, { ok: true, output: ["first"] });
const stop = raced.subscribe(GetPages, input, () => {});
raced.afterCommand(Bump, DONE);
raced.afterCommand(Bump, DONE);
await racing.answer(2, { ok: true, output: ["newest"] });
await racing.answer(1, { ok: true, output: ["older"] });
check("overlapping re-reads: only the latest issued read writes", raced.peek(key)?.data, ["newest"]);
stop();
check("dropping the last listener drops the entry", raced.peek(key), null);

const failing = new ScriptedSender();
const failed = new QueryStore(failing);
failed.start(GetPages, input);
await failing.answer(0, { ok: false, reason: "gone", ran: false });
check("a failed read settles as failed", failed.peek(key)?.status, "failed");
failed.start(GetPages, input);
check(
	"a failed entry with no listeners is read again on start",
	[failing.pending.length, failed.peek(key)?.status],
	[2, "loading"],
);
const watching = new ScriptedSender();
const watched = new QueryStore(watching);
const listening = watched.subscribe(GetPages, input, () => {});
await watching.answer(0, { ok: false, reason: "gone", ran: false });
watched.start(GetPages, input);
check(
	"a failed entry someone listens to is kept as it is",
	[watching.pending.length, watched.peek(key)?.status],
	[1, "failed"],
);
listening();

const quiet = new ScriptedSender();
const unchanged = new QueryStore(quiet);
unchanged.start(GetPages, input);
const held = unchanged.subscribe(GetPages, input, () => {});
unchanged.afterCommand(Bump, { ok: false, reason: "no", ran: false });
check("a command that did not run re-reads nothing", quiet.pending.length, 1);
unchanged.afterCommand(GetPages, DONE);
check("a query re-reads nothing", quiet.pending.length, 1);
held();
