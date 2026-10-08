import { classifyScenario } from "./classify.mjs";

/**
 * Score the learner's 13 CBC classifications plus an optional interpretation.
 * All index classifications are derived from the generated scenario.
 */
export function scoreAnswers(pattern, scenario, answers) {
  if (!pattern || !scenario || !answers) {
    throw new TypeError("pattern_scenario_answers_required");
  }

  const expected = classifyScenario(scenario, pattern, scenario.sex);
  const expectedAssertion = pattern.expected_classifications;

  if (expectedAssertion) {
    for (const key of Object.keys(expected)) {
      if (expectedAssertion[key] !== expected[key]) {
        throw new Error("expected_classification_mismatch:" + key);
      }
    }
  }

  let total = 0;
  let earned = 0;
  const explanations = [];

  for (const key of Object.keys(expected)) {
    total += 1;
    const received = answers.classifications?.[key];
    const correct = received === expected[key];

    if (correct) {
      earned += 1;
    }

    explanations.push({
      index: key,
      correct,
      expected: expected[key],
      received: received ?? null
    });
  }

  const acceptedInterpretations = Array.isArray(pattern.accepted_interpretations)
    ? pattern.accepted_interpretations
    : [];

  if (acceptedInterpretations.length > 0) {
    const interpretationOk = acceptedInterpretations.includes(answers.interpretation);
    total += 1;

    if (interpretationOk) {
      earned += 1;
    }

    explanations.push({
      index: "interpretation",
      correct: interpretationOk,
      expected: acceptedInterpretations,
      received: answers.interpretation ?? null
    });
  }

  return {
    score: total ? earned / total : 0,
    earned,
    total,
    explanations
  };
}
