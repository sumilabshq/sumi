import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Question } from "@sumi/contract";
import { Icon } from "@widgetarium/kit";
import type { QuestionDoing } from "../../lib/use-question-doing.js";

const UNDO = "Undo";
const ANSWERED = "{answer} · {question}";
const SKIPPED = "Skipped · {skipSays}";

export function SettledRow({
  question,
  doing,
}: {
  readonly question: Question;
  readonly doing: QuestionDoing;
}): ReactElement {
  const isSkipped = question.state === "skipped";
  return (
    <div className="wg-questions-card is-settled">
      <span
        className={`wg-questions-num ${isSkipped ? "is-skipped" : "is-answered"}`}
      >
        {isSkipped ? (
          <Icon name="skip-forward" />
        ) : (
          <svg className="wg-questions-check" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="wg-questions-card-text">{settledSaidOf(question)}</span>
      <button
        type="button"
        className="wg-questions-btn"
        onClick={() => doing.reopen(question.id)}
      >
        {UNDO}
      </button>
    </div>
  );
}

function settledSaidOf(question: Question): string {
  if (question.state === "skipped") {
    return SKIPPED.replace("{skipSays}", question.skipSays);
  }

  const answer = [
    ...question.picked,
    ...(question.own === null ? [] : [question.own]),
  ].join(", ");
  return ANSWERED.replace("{answer}", answer).replace(
    "{question}",
    question.question,
  );
}
