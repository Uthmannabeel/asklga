/**
 * Strips personal identifiers from a question before it is logged or sent to a model.
 * Rule-based on purpose: it runs before any model call, so it cannot depend on one.
 * Coverage: email addresses, Nigerian and international phone numbers, 10 to 16 digit runs
 * (NIN, BVN, account numbers), and explicit "my name is X" patterns in English and Pidgin.
 * Names in free text are not detected; the answer engine is instructed never to repeat them.
 */
const RULES: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/gi, "[email removed]"],
  [/(?:\+?234|0)[\s-]?[789][01]\d[\s-]?\d{3}[\s-]?\d{4}/g, "[phone removed]"],
  [/\b\d{10,16}\b/g, "[number removed]"],
  [/\b(my name is|i am called|na)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}(\s+be my name)?/g, "$1 [name removed]"],
];

export function scrubPii(input: string): { text: string; removed: number } {
  let removed = 0;
  let text = input;
  for (const [re, rep] of RULES) {
    const matches = text.match(re);
    if (matches) {
      removed += matches.length;
      text = text.replace(re, rep);
    }
  }
  return { text: text.trim(), removed };
}
