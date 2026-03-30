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
import hardcodedSecret from './hardcoded-secret';
import insecureRandomness from './insecure-randomness';
import dangerousEval from './dangerous-eval';
import dangerousShellExec from './dangerous-shell-exec';
import sqlStringInterpolation from './sql-string-interpolation';
import parameterMutation from './parameter-mutation';
import broadException from './broad-exception';
import duplicateBranch from './duplicate-branch';
import missingDefaultSwitch from './missing-default-switch';
import unsafeJsonParse from './unsafe-json-parse';

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
  hardcodedSecret,
  insecureRandomness,
  dangerousEval,
  dangerousShellExec,
  sqlStringInterpolation,
  parameterMutation,
  broadException,
  duplicateBranch,
  missingDefaultSwitch,
  unsafeJsonParse,
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
  hardcodedSecret,
  insecureRandomness,
  dangerousEval,
  dangerousShellExec,
  sqlStringInterpolation,
  parameterMutation,
  broadException,
  duplicateBranch,
  missingDefaultSwitch,
  unsafeJsonParse,
};

// Get detectors for a specific language
export function getDetectorsForLanguage(language: string): Detector[] {
  return detectors.filter((detector) =>
    detector.supportedLanguages.some((supportedLanguage) => supportedLanguage === language)
  );
}

// Get detector by name
export function getDetectorByName(name: string): Detector | undefined {
  return detectors.find((d) => d.name === name);
}
