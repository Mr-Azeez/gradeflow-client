/**
 * Matches valid Roman numerals (I – MMMCMXCIX).
 * The regex is anchored so only whole words are tested.
 * An empty string would technically match the pattern, so we
 * guard with `word.length > 0` at the call site.
 */
const ROMAN_NUMERAL_RE =
  /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

/**
 * Converts a string to title case while keeping Roman numerals fully
 * uppercase.  Works for any suffix position and any future courses.
 *
 * Examples:
 *   "introduction to physics ii"  → "Introduction To Physics II"
 *   "civil engineering iv"        → "Civil Engineering IV"
 *   "data structures and algorithms" → "Data Structures And Algorithms"
 */
export const titleCase = (value: string): string => {
  if (!value) return "";
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w+/g, (word) => {
      if (word.length > 0 && ROMAN_NUMERAL_RE.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
};
