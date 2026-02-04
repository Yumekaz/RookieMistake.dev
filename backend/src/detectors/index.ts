import { Detector } from '../types';

import missingAwait from './missing-await';
import doubleEquals from './double-equals';
import nullableAccess from './nullable-access';
import variableShadowing from './variable-shadowing';
import offByOneLoop from './off-by-one-loop';
import noErrorHandling from './no-error-handling';
import arrayMutation from './array-mutation';
import varUsage from './var-usage';
import consoleLogLeft from './console-log-left';
import emptyCatch from './empty-catch';

// All available detectors
export const detectors: Detector[] = [
  missingAwait,
  doubleEquals,
  nullableAccess,
  variableShadowing,
  offByOneLoop,
  noErrorHandling,
  arrayMutation,
  varUsage,
  consoleLogLeft,
  emptyCatch,
];

// Export individual detectors for testing
export {
  missingAwait,
  doubleEquals,
  nullableAccess,
  variableShadowing,
  offByOneLoop,
  noErrorHandling,
  arrayMutation,
  varUsage,
  consoleLogLeft,
  emptyCatch,
};

// Get detectors for a specific language
export function getDetectorsForLanguage(language: string): Detector[] {
  return detectors.filter((d) => d.supportedLanguages.includes(language as any));
}

// Get detector by name
export function getDetectorByName(name: string): Detector | undefined {
  return detectors.find((d) => d.name === name);
}
