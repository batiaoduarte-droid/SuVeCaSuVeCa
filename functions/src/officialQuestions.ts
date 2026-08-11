/**
 * Canonical answer key for the official 20-question SuVeCA mock exam.
 * It intentionally lives on the trusted side so public ranking totals are
 * calculated from answers rather than any number sent by the browser.
 */
export const OFFICIAL_SIMULADO_ANSWER_KEY = {
  'sim-1': 'E',
  'sim-2': 'C',
  'sim-3': 'C',
  'sim-4': 'E',
  'sim-5': 'E',
  'sim-6': 'C',
  'sim-7': 'C',
  'sim-8': 'E',
  'sim-9': 'C',
  'sim-10': 'E',
  'sim-11': 'C',
  'sim-12': 'E',
  'sim-13': 'E',
  'sim-14': 'C',
  'sim-15': 'E',
  'sim-16': 'C',
  'sim-17': 'C',
  'sim-18': 'E',
  'sim-19': 'C',
  'sim-20': 'C',
} as const;

export const OFFICIAL_SIMULADO_VERSION = 'official-simulado-v1';
