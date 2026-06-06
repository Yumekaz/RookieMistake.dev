import { nanoid } from 'nanoid';
import { generateExplanation } from '../explainers';
import { getDetectorsForLanguage } from '../detectors';
import { parseCode } from '../parser';
import { logger } from './logger';
import {
  AnalysisProfile,
  AnalyzeResponse,
  Certainty,
  Language,
  Mistake,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  ProjectFileAnalysis,
  ProjectFileInput,
  ProjectFinding,
  Severity,
} from '../types';

const severityWeights: Record<Severity, number> = {
  error: 2.5,
  warning: 1.35,
  info: 0.6,
};

const certaintyWeights: Record<Certainty, number> = {
  definite: 1,
  possible: 0.84,
  heuristic: 0.68,
};

const profileSettings: Record<
  AnalysisProfile,
  {
    scoreMultiplier: number;
    includeFinding: (finding: ProjectFinding) => boolean;
  }
> = {
  balanced: {
    scoreMultiplier: 1,
    includeFinding: () => true,
  },
  focused: {
    scoreMultiplier: 0.9,
    includeFinding: (finding) =>
      finding.severity !== 'info' || finding.confidence >= 0.75 || finding.certainty === 'definite',
  },
  strict: {
    scoreMultiplier: 1.2,
    includeFinding: () => true,
  },
};

function clampScore(score: number): number {
  return Math.min(10, Math.max(0, Number(score.toFixed(1))));
}

function countLines(code: string): number {
  return code.split(/\r?\n/).length;
}

function scoreFile(findings: ProjectFinding[], lineCount: number, profile: AnalysisProfile): number {
  const profileConfig = profileSettings[profile];

  const weightedPenalty = findings.reduce((accumulator, finding) => {
    const confidenceFactor = 0.75 + finding.confidence * 0.5;
    return (
      accumulator +
      severityWeights[finding.severity] * certaintyWeights[finding.certainty] * confidenceFactor
    );
  }, 0);

  const densityPenalty = weightedPenalty / Math.max(1, Math.sqrt(lineCount));
  return clampScore(10 - densityPenalty * profileConfig.scoreMultiplier);
}

function stripMistakeMetadata(finding: ProjectFinding): Mistake {
  const mistake = { ...finding };
  delete (mistake as Partial<ProjectFinding>).findingId;
  delete (mistake as Partial<ProjectFinding>).filePath;
  delete (mistake as Partial<ProjectFinding>).language;
  return mistake;
}

function convertDetectorResult(
  filePath: string,
  language: Language,
  detectorResult: Omit<Mistake, 'id'>,
  fileFindingId: number
): ProjectFinding {
  return {
    ...detectorResult,
    id: fileFindingId,
    findingId: nanoid(12),
    filePath,
    language,
  };
}

function runDetectorsForFile(
  file: ProjectFileInput,
  profile: AnalysisProfile
): {
  analysis: ProjectFileAnalysis;
  findings: ProjectFinding[];
} {
  const lineCount = countLines(file.code);
  const settings = profileSettings[profile];

  try {
    const tree = parseCode(file.code, file.language as Language);
    const detectors = getDetectorsForLanguage(file.language as Language);
    const findings: ProjectFinding[] = [];
    let fileFindingId = 1;

    for (const detector of detectors) {
      try {
        const detectorResults = detector.detect(file.code, file.language as Language, tree);

        for (const result of detectorResults) {
          const { explanation, fix, codeExample } = generateExplanation(result.name, {
            ...result.ast_facts,
            language: file.language,
            certainty: result.certainty,
          });

          const finding = convertDetectorResult(
            file.path,
            file.language,
            {
              ...result,
              explanation,
              fix,
              codeExample,
            },
            fileFindingId++
          );

          if (settings.includeFinding(finding)) {
            findings.push(finding);
          }
        }
      } catch (detectorError) {
        logger.error('Project detector failed', {
          filePath: file.path,
          language: file.language,
          detector: detector.name,
          error: detectorError instanceof Error ? detectorError.message : 'Unknown error',
        });
      }
    }

    findings.sort((a, b) => a.line - b.line || a.column - b.column);

    return {
      analysis: {
        path: file.path,
        language: file.language,
        lineCount,
        score: scoreFile(findings, lineCount, profile),
        findingCount: findings.length,
        findings,
        status: 'ok',
      },
      findings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse source file';

    return {
      analysis: {
        path: file.path,
        language: file.language,
        lineCount,
        score: 0,
        findingCount: 0,
        findings: [],
        status: 'parse_error',
        error: message,
      },
      findings: [],
    };
  }
}

export function analyzeSingleFile(
  code: string,
  language: Language
): AnalyzeResponse {
  const tree = parseCode(code, language);
  const detectors = getDetectorsForLanguage(language);
  const findings: ProjectFinding[] = [];
  let fileFindingId = 1;

  for (const detector of detectors) {
    try {
      const detectorResults = detector.detect(code, language, tree);

      for (const result of detectorResults) {
        const { explanation, fix, codeExample } = generateExplanation(result.name, {
          ...result.ast_facts,
          language,
          certainty: result.certainty,
        });

        findings.push(
          convertDetectorResult(
            '__single_snippet__',
            language,
            {
              ...result,
              explanation,
              fix,
              codeExample,
            },
            fileFindingId++
          )
        );
      }
    } catch (detectorError) {
      logger.error('Detector failed during single-file analysis', {
        language,
        detector: detector.name,
        error: detectorError instanceof Error ? detectorError.message : 'Unknown error',
      });
    }
  }

  findings.sort((a, b) => a.line - b.line || a.column - b.column);

  return {
    mistakes: findings.map(stripMistakeMetadata),
    score: scoreFile(findings, countLines(code), 'balanced'),
  };
}

export function analyzeProject(
  analysisId: string,
  request: ProjectAnalysisRequest
): ProjectAnalysisResponse {
  const files: ProjectFileAnalysis[] = [];
  const allFindings: ProjectFinding[] = [];
  const severityCounts: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };

  for (const file of request.files) {
    const result = runDetectorsForFile(file, request.profile);
    files.push(result.analysis);
    allFindings.push(...result.findings);

    for (const finding of result.findings) {
      severityCounts[finding.severity] += 1;
    }
  }

  const fileCount = files.length;
  const filesWithFindings = files.filter((file) => file.findingCount > 0).length;
  const parseErrorCount = files.filter((file) => file.status === 'parse_error').length;
  const findingCount = allFindings.length;

  const weightedScore = files.reduce((accumulator, file) => {
    const weight = Math.max(1, Math.log2(file.lineCount + 1));
    return accumulator + file.score * weight;
  }, 0);

  const totalWeight = files.reduce((accumulator, file) => accumulator + Math.max(1, Math.log2(file.lineCount + 1)), 0);
  const averageFileScore = files.length
    ? files.reduce((accumulator, file) => accumulator + file.score, 0) / files.length
    : 0;

  return {
    analysisId,
    profile: request.profile,
    summary: {
      profile: request.profile,
      score: clampScore(totalWeight > 0 ? weightedScore / totalWeight : 0),
      averageFileScore: clampScore(averageFileScore),
      fileCount,
      filesWithFindings,
      parseErrorCount,
      findingCount,
      severityCounts,
    },
    files,
    findings: allFindings,
  };
}
