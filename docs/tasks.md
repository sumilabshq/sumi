# Agent tasks

## Owner

- `tasks.json` in the workspace is written only by the tasks module (`packages/domain/tasks`) served in the core window; every other window reads and asks through it.
- Every change is one command with a reason, logged as `from → to` with who made it.

## Who creates

- Only agents create tasks, with the `task_create` tool; the person never creates one.
- An agent searches before it creates, and an open task with the same title is answered instead of a new one.
- A task is worth making for work of 3+ steps, code changed in more than one place, research with a written result, work outliving the turn, or work found but not asked for (backlog).

## Statuses and moves

- Statuses: backlog, todo, in_progress, ready_to_test, done, paused, blocked, cancelled.
- backlog → todo, in_progress, cancelled.
- todo → backlog, in_progress, cancelled.
- in_progress → ready_to_test, done, paused, blocked, todo, cancelled.
- paused → in_progress, blocked, todo, cancelled.
- blocked → in_progress, paused, todo, cancelled.
- ready_to_test → done, in_progress, todo, cancelled.
- done → in_progress.
- cancelled → todo.
- Moving to paused, blocked or cancelled needs a note.
- Moving to todo or backlog clears the owner; moving to in_progress makes the moving chat the owner.
- A chat holds at most one task in_progress.
- An agent changes only a task its own chat owns, or one nobody owns.

## Gates

- in_progress needs at least one acceptance criterion and one plan step.
- in_progress on a code task needs a workplace: folder and branch.
- in_progress waits until every blocking task is closed.
- ready_to_test needs every step done, skipped or cancelled, and every criterion met or dropped.
- ready_to_test on a code task needs a test plan and a last test run with every case run and none failed.
- A criterion is met only with evidence; dropping one needs a reason.
- An agent's done needs the same as ready_to_test, plus every subtask closed.
- A task holds at most 50 criteria, 100 steps and 20 blocking tasks.

## Agent rights

- The agent may do on a task everything the person can.
- Done on a code task, done from ready_to_test, reopening a done or cancelled task, and ready_to_test → todo happen only on the person's word in this chat, quoted as the note.
- Without that note the move is refused and says whose call it is.
- An agent's move reads in Activity as by its chat's title.

## Stop guard

- A turn ending with its chat's task in_progress gets a nudge from the host to go on or move the task.
- A turn the person started is nudged but not counted.
- After 2 counted nudges, the next turn ending without a move blocks the task as stalled.
- A turn ending while the person writes in that chat pauses the task: "waiting for you".
- A turn the person stops pauses the task: "stopped by you".
- A failed turn blocks the task: session_silent, usage_limit or session_failed, with the detail.
- A usage limit blocks with its reset time, and the card offers Continue at that time.
- A cleared or deleted chat blocks its task in_progress and drops it as owner.
- An app start blocks every task in_progress whose turn no longer runs: interrupted.

## Person's actions

- Accept moves ready_to_test → done.
- Send back moves ready_to_test → in_progress in the owner chat with the person's note added as a criterion, or → todo when no chat takes it.
- Continue moves paused or blocked → in_progress and hands the chat a message to go on.
- Keep restarts the stale clock of a stale task.

## Stale tasks

- paused: stale after 14 quiet days, cancelled after 28.
- backlog: stale after 60 quiet days, cancelled after 90.
- ready_to_test: stale after 3 quiet days, closed after 14 as done by the host: "Done · not confirmed: no answer for N days".
- A stale card shows "waiting N days" and offers Keep.
- The sweep runs at core start and every six hours.
- A task closed by silence reopens like any done task.

## Chats on a task

- Working chat: the owner, shown only while the task is in_progress.
- Touched by: every chat that created or changed the task, by title.
