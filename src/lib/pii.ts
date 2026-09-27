/**
 * Strips personal identifiers from a question before it is logged or sent to a model.
 * Rule-based on purpose: it runs before any model call, so it cannot depend on one.
 * Coverage: email addresses; Nigerian mobile and landline numbers in their common spacings and
 * the +234 form; 10 to 16 digit runs with or without spaces (NIN, BVN, account numbers);
 * explicit name introductions in English, Pidgin, Hausa, Yoruba and Igbo.
 * Names in free text are not detected; the answer engine is instructed never to repeat them.
 */
const NAME = "[\\p{Lu}][\\p{L}'\\-]+(?:\\s+[\\p{Lu}][\\p{L}'\\-]+){0,2}";

const RULES: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/gi, "[email removed]"],
  // Mobiles: 0803 123 4567, 0803-123-4567, 08031234567, +234 803 123 4567, +234 (0) 803 1234 567
  [/(?:\+?234[\s-]*(?:\(0\)[\s-]*)?|0)[789][01]\d(?:[\s-]*\d){7}\b/g, "[phone removed]"],
  // Landlines: 084 123 4567 (Port Harcourt), 01 234 5678 (Lagos), 09 234 5678 (Abuja)
  [/\b0(?:1|9|[2-8]\d)[\s-]*\d{3}[\s-]*\d{4}\b/g, "[phone removed]"],
  // Long identifiers, with or without grouping spaces: NIN 1234 5678 901, BVN, account numbers
  [/\b\d(?:[\s-]?\d){9,15}\b/g, "[number removed]"],
  // "my name is X" and equivalents. "na" alone is the Pidgin copula, so it only counts after "name".
  [new RegExp(`\\b(my name is|i am called|my name na|name na|my name be|sunana|suna na|orúkọ mi ni|oruko mi ni|aha m bụ|aha m bu)\\s+${NAME}(\\s+be my name)?`, "giu"), "$1 [name removed]"],
  [new RegExp(`\\b(${NAME})\\s+(na|be)\\s+my\\s+name\\b`, "gu"), "[name removed] $2 my name"],
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
