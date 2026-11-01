import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { Question } from "@sumi/contract";
import { Icon } from "@widgetarium/kit";
import type { QuestionDoing } from "../../lib/use-question-doing.js";
import { QuestionCard } from "./question-card.js";
import { QuestionFace } from "./question-face.js";
import { SettledRow } from "./settled-row.js";
import { SkipButton } from "./skip-button.js";

const OPTIONAL_COUNT = "{count} optional";
const LEFT_COUNT = "{count} left";
const ALL_ANSWERED = "All answered";
const NONE_DONE_TITLE = "{count} optional asks";
const NONE_DONE_SAID = "Skip any of them, Sumi uses its default";
const SOME_DONE_TITLE = "{count} asks left";
const SOME_DONE_SAID = "{done} done · Sumi keeps working";
const SKIP_ALL = "Skip all";
const SKIP = "Skip";
const HIDE = "Hide optional asks";
const SHOW = "Show optional asks";

export function OptionalBlock({
  questions,
  doing,
}: {
  readonly questions: readonly Question[];
  readonly doing: QuestionDoing;
}): ReactElement {
  const [isOpen, setOpen] = useState(false);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const open = questions.filter(({ state }) => state === "open");
  const settled = questions.filter(({ state }) => state !== "open");
  const shownId = open.some(({ id }) => id === chosenId)
    ? chosenId
    : (open[0]?.id ?? null);
  const numberOf = (question: Question): number =>
    questions.indexOf(question) + 1;

  if (!isOpen) {
    return (
      <div className="wg-questions-pill-row">
        <button
          type="button"
          className="wg-questions-pill"
          aria-expanded={false}
          aria-label={SHOW}
          onClick={() => setOpen(true)}
        >
          <QuestionFace />
          {pillSaidOf(open.length, settled.length)}
          <Icon name="chevron-up" />
        </button>
      </div>
    );
  }

  return (
    <section className="wg-questions-block is-optional" aria-label={HIDE}>
      <header className="wg-questions-block-head">
        <QuestionFace />
        <span className="wg-questions-block-title">
          <b>{titleOf(open.length, settled.length)}</b>
          <span>
            {settled.length === 0
              ? NONE_DONE_SAID
              : SOME_DONE_SAID.replace("{done}", String(settled.length))}
          </span>
        </span>
        {open.length === 0 ? null : (
          <SkipButton
            label={SKIP_ALL}
            onSkip={() => doing.skip(open.map(({ id }) => id))}
          />
        )}
        <button
          type="button"
          className="wg-questions-hide"
          aria-expanded={true}
          aria-label={HIDE}
          onClick={() => setOpen(false)}
        >
          <Icon name="chevron-down" />
        </button>
      </header>
      <div className="wg-questions-list">
        {settled.map((question) => (
          <SettledRow key={question.id} question={question} doing={doing} />
        ))}
        {open.map((question) =>
          question.id === shownId ? (
            <QuestionCard
              key={question.id}
              question={question}
              number={numberOf(question)}
              doing={doing}
            />
          ) : (
            <div key={question.id} className="wg-questions-card is-row">
              <span className="wg-questions-num">{numberOf(question)}</span>
              <button
                type="button"
                className="wg-questions-card-text"
                onClick={() => setChosenId(question.id)}
              >
                {question.question}
              </button>
              <SkipButton
                label={SKIP}
                onSkip={() => doing.skip([question.id])}
              />
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function pillSaidOf(open: number, settled: number): string {
  if (open === 0) {
    return ALL_ANSWERED;
  }

  return (settled === 0 ? OPTIONAL_COUNT : LEFT_COUNT).replace(
    "{count}",
    String(open),
  );
}

function titleOf(open: number, settled: number): string {
  if (open === 0) {
    return ALL_ANSWERED;
  }

  return (settled === 0 ? NONE_DONE_TITLE : SOME_DONE_TITLE).replace(
    "{count}",
    String(open),
  );
}
