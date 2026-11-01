import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Question } from "@sumi/contract";
import type { QuestionDoing } from "../../lib/use-question-doing.js";
import { QuestionCard } from "./question-card.js";
import { QuestionFace } from "./question-face.js";

const WAITING = "Sumi is waiting for you";
const ONE_LEFT = "Nothing left to do without your answer";
const SOME_LEFT = "1 of {count} · nothing left to do without these";
const NEXT = "next";

export function NeededBlock({
  questions,
  doing,
}: {
  readonly questions: readonly Question[];
  readonly doing: QuestionDoing;
}): ReactElement | null {
  const [current, ...waiting] = questions;

  if (current === undefined) {
    return null;
  }

  const isMany = waiting.length > 0;
  return (
    <section className="wg-questions-block is-needed" aria-label={WAITING}>
      <header className="wg-questions-block-head">
        <QuestionFace />
        <span className="wg-questions-block-title">
          <b>{WAITING}</b>
          <span>
            {isMany
              ? SOME_LEFT.replace("{count}", String(questions.length))
              : ONE_LEFT}
          </span>
        </span>
      </header>
      <div className="wg-questions-list">
        <QuestionCard
          key={current.id}
          question={current}
          number={isMany ? 1 : null}
          doing={doing}
        />
        {waiting.map((question, at) => (
          <div key={question.id} className="wg-questions-next">
            <span className="wg-questions-next-num">{at + 2}</span>
            <span className="wg-questions-next-text">{question.question}</span>
            <span className="wg-questions-next-kind">{NEXT}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
