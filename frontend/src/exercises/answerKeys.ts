// Answer buttons are picked by position: 1 to 9, then 0, - and =.
export const ANSWER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=']
const CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal']

// Matches the physical key (code), not the typed character: on AZERTY the digit row types &é"'… without Shift.
// A modifier leaves the key to the browser (Cmd+1 switches tabs).
export const answerIndexOf = (event: KeyboardEvent) =>
  event.ctrlKey || event.metaKey || event.altKey ? -1 : CODES.indexOf(event.code.replace('Numpad', 'Digit'))
