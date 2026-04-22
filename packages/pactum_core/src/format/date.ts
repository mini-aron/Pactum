const FORMAT_TOKEN_CHARS = new Set(['y', 'Y', 'M', 'm', 'd', 'D', 'h', 'H', 's', 'S']);
const REGEX_SPECIAL_CHARS = new Set(['\\', '^', '$', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|']);

const escapeRegexChar = (char: string): string =>
  REGEX_SPECIAL_CHARS.has(char) ? `\\${char}` : char;

export const dateFormatToRegexPattern = (format: string): string => {
  let pattern = '';

  for (let index = 0; index < format.length;) {
    const char = format[index];
    if (char === undefined) break;

    if (FORMAT_TOKEN_CHARS.has(char)) {
      let tokenLength = 1;
      while (format[index + tokenLength] === char) {
        tokenLength += 1;
      }
      pattern += `\\d{${tokenLength}}`;
      index += tokenLength;
      continue;
    }

    pattern += escapeRegexChar(char);
    index += 1;
  }

  return pattern;
};

export const matchesDateFormat = (format: string, value: string): boolean => {
  const trimmedFormat = format.trim();
  if (!trimmedFormat) return true;

  return new RegExp(`^(?:${dateFormatToRegexPattern(trimmedFormat)})$`).test(value);
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isIsoDateString = (value: string): boolean =>
  ISO_DATE_PATTERN.test(value);

export const formatDateValue = (
  value: string,
  format: string | undefined
): string => {
  const match = ISO_DATE_PATTERN.exec(value);
  const trimmedFormat = format?.trim();
  if (!match || !trimmedFormat) return value;

  const [, year = '', month = '', day = ''] = match;

  let formatted = '';
  for (let index = 0; index < trimmedFormat.length;) {
    const char = trimmedFormat[index];
    if (char === undefined) break;

    let tokenLength = 1;
    while (trimmedFormat[index + tokenLength] === char) {
      tokenLength += 1;
    }

    if (char === 'y' || char === 'Y') {
      formatted += tokenLength === 2 ? year.slice(-2) : year.padStart(tokenLength, '0');
      index += tokenLength;
      continue;
    }

    if (char === 'M' || char === 'm') {
      formatted += tokenLength === 1 ? String(Number(month)) : month.padStart(tokenLength, '0');
      index += tokenLength;
      continue;
    }

    if (char === 'd' || char === 'D') {
      formatted += tokenLength === 1 ? String(Number(day)) : day.padStart(tokenLength, '0');
      index += tokenLength;
      continue;
    }

    formatted += char;
    index += 1;
  }

  return formatted;
};
