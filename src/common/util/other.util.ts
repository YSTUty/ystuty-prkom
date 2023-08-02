export function convertToSnilsUid(number: string | number) {
  const len = 11;
  const pattern = ''.padEnd(len, '0');
  const snils = pattern + number.toString();
  const snilsWithSeparators = snils
    .slice(-len)
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1-$2-$3 $4');
  return snilsWithSeparators;
}

export function convertToNumericUid(number: string | number) {
  const len = 9;
  const pattern = ''.padEnd(len, '0');
  const uid = pattern + number.toString();
  return uid.slice(-len);
}

export function convertToNumeric(number: string) {
  return number?.replace(/[^0-9\-\s]+/g, '').trim();
}
