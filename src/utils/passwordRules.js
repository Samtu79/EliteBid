export function getPasswordStatus(password = '', confirmPassword = '') {
  return {
    length: password.length >= 8 && password.length <= 72,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    noSpaces: password.length > 0 && !/\s/.test(password),
    matches: password.length > 0 && password === confirmPassword
  };
}

export function isPasswordReady(status) {
  return Boolean(
    status.length &&
      status.letter &&
      status.number &&
      status.symbol &&
      status.noSpaces &&
      status.matches
  );
}

export const passwordRuleCopy = [
  ['length', 'Entre 8 y 72 caracteres'],
  ['letter', 'Al menos una letra'],
  ['number', 'Al menos un número'],
  ['symbol', 'Al menos un símbolo'],
  ['noSpaces', 'Sin espacios']
];
