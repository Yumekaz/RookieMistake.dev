import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

const JS_SHELL_APIS = [
  'exec',
  'execSync',
  'execFile',
  'execFileSync',
  'spawn',
  'spawnSync',
];

const PY_SHELL_APIS = ['os.system', 'subprocess.run', 'subprocess.call', 'subprocess.Popen', 'subprocess.check_output'];

function hasStringInterpolation(text: string): boolean {
  return /\$\{/.test(text) || /shell\s*:\s*true/i.test(text) || /shell=True/i.test(text) || /\+/.test(text);
}

function getApiName(callText: string, language: Language): string | null {
  if (language === 'python') {
    for (const api of PY_SHELL_APIS) {
      if (callText.includes(api)) {
        return api;
      }
    }
    return null;
  }

  for (const api of JS_SHELL_APIS) {
    if (new RegExp(`\\b${api}\\s*\\(`).test(callText) || callText.includes(`.${api}(`)) {
      return api;
    }
  }

  return null;
}

const dangerousShellExecDetector: Detector = {
  name: 'dangerous_shell_exec',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;
    const nodes = findNodes(root, ['call_expression', 'call', 'new_expression']);

    for (const node of nodes) {
      const callText = getNodeText(node, code);
      const apiName = getApiName(callText, language);

      if (!apiName) {
        continue;
      }

      if (
        language !== 'python' &&
        ['spawn', 'spawnSync', 'execFile', 'execFileSync'].includes(apiName) &&
        !hasStringInterpolation(callText)
      ) {
        continue;
      }

      if (language === 'python' && !(/shell\s*=\s*true/i.test(callText) || /os\.system\(/.test(callText) || /\$\{/.test(callText) || /f['"]/.test(callText))) {
        continue;
      }

      results.push({
        name: 'dangerous_shell_exec',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'error',
        certainty: 'definite',
        confidence: 0.95,
        scope: 'function',
        message: `Shell command execution through '${apiName}' can lead to command injection`,
        ast_facts: {
          api_name: apiName,
          command_preview: callText.slice(0, 80),
        },
      });
    }

    return results;
  },
};

export default dangerousShellExecDetector;
