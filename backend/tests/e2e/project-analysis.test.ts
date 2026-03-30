import request from 'supertest';
import app, { initializeApp } from '../../src/index';
import { getFindingFeedback } from '../../src/db';

describe('E2E: POST /api/v1/projects/analyze', () => {
  beforeAll(async () => {
    await initializeApp();
  }, 30000);

  it('analyzes multiple files and keeps going when one file has syntax errors', async () => {
    const response = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'balanced',
        files: [
          {
            path: 'src/app.ts',
            language: 'typescript',
            code: `
var name = 'demo';

async function loadUser() {
  return { id: 1 };
}

async function main() {
  loadUser();
}
`,
          },
          {
            path: 'src/broken.js',
            language: 'javascript',
            code: `
function broken( {
  return 1;
}
`,
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('analysisId');
    expect(response.body).toHaveProperty('profile', 'balanced');
    expect(response.body).toHaveProperty('summary');
    expect(response.body.summary).toHaveProperty('fileCount', 2);
    expect(response.body.summary).toHaveProperty('parseErrorCount', 1);
    expect(response.body.summary).toHaveProperty('findingCount');
    expect(response.body.summary).toHaveProperty('score');
    expect(response.body.summary.score).toBeGreaterThanOrEqual(0);
    expect(response.body.summary.score).toBeLessThanOrEqual(10);

    expect(Array.isArray(response.body.files)).toBe(true);
    expect(response.body.files).toHaveLength(2);
    expect(Array.isArray(response.body.findings)).toBe(true);
    expect(response.body.findings.length).toBeGreaterThan(0);

    const parseErrorFile = response.body.files.find((file: { path: string }) => file.path === 'src/broken.js');
    expect(parseErrorFile).toBeDefined();
    expect(parseErrorFile.status).toBe('parse_error');

    const retrieved = await request(app)
      .get(`/api/v1/projects/${response.body.analysisId}`)
      .expect(200);

    expect(retrieved.body.analysisId).toBe(response.body.analysisId);
    expect(retrieved.body.request.profile).toBe('balanced');
    expect(retrieved.body.created_at).toBeDefined();
  });
});

describe('E2E: GET /api/v1/projects/recent', () => {
  beforeAll(async () => {
    await initializeApp();
  }, 30000);

  it('returns recent analyses with UI-friendly summary cards', async () => {
    const firstAnalysis = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'balanced',
        files: [
          {
            path: 'src/first.js',
            language: 'javascript',
            code: `
var count = 0;
if (count == 1) {
  console.log(count);
}
`,
          },
        ],
      })
      .expect(201);

    const secondAnalysis = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'strict',
        files: [
          {
            path: 'src/second.ts',
            language: 'typescript',
            code: `
let value = 1;
if (value === 2) {
  console.log(value);
}
`,
          },
        ],
      })
      .expect(201);

    const response = await request(app)
      .get('/api/v1/projects/recent')
      .query({ limit: 2 })
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(2);
    expect(response.body.analyses).toHaveLength(2);
    expect(response.body.analyses[0].id).toBe(secondAnalysis.body.analysisId);
    expect(response.body.analyses[1].id).toBe(firstAnalysis.body.analysisId);
    expect(response.body.analyses[0]).toEqual(
      expect.objectContaining({
        profile: 'strict',
        topFiles: expect.any(Array),
        topFindings: expect.any(Array),
        topSeverity: expect.any(String),
      })
    );
  });
});

describe('E2E: GET /api/v1/projects/compare', () => {
  beforeAll(async () => {
    await initializeApp();
  }, 30000);

  it('compares two project analyses using score and finding deltas', async () => {
    const baseline = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'balanced',
        files: [
          {
            path: 'src/compare.js',
            language: 'javascript',
            code: `
var count = 0;
if (count == 1) {
  console.log(count);
}
`,
          },
        ],
      })
      .expect(201);

    const candidate = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'balanced',
        files: [
          {
            path: 'src/compare.js',
            language: 'javascript',
            code: `
let count = 0;
if (count == 1) {
  console.log(count);
}
`,
          },
        ],
      })
      .expect(201);

    const comparison = await request(app)
      .get('/api/v1/projects/compare')
      .query({
        baseId: baseline.body.analysisId,
        targetId: candidate.body.analysisId,
      })
      .expect(200);

    expect(comparison.body.baseline.id).toBe(baseline.body.analysisId);
    expect(comparison.body.candidate.id).toBe(candidate.body.analysisId);
    expect(comparison.body.summary).toEqual(
      expect.objectContaining({
        scoreDelta: expect.any(Number),
        findingDelta: expect.any(Number),
        fileDelta: 0,
        parseErrorDelta: 0,
      })
    );
    expect(Array.isArray(comparison.body.summary.resolvedFindings)).toBe(true);
    expect(comparison.body.summary.resolvedFindings.length).toBeGreaterThan(0);
  });
});

describe('E2E: POST /api/v1/feedback', () => {
  it('persists feedback for a finding and updates it on repeat submissions', async () => {
    const analysisResponse = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'focused',
        files: [
          {
            path: 'src/index.js',
            language: 'javascript',
            code: `
var counter = 0;
if (counter == 1) {
  console.log('bad');
}
`,
          },
        ],
      })
      .expect(201);

    const finding = analysisResponse.body.findings[0];
    expect(finding).toBeDefined();

    const firstFeedback = await request(app)
      .post('/api/v1/feedback')
      .send({
        analysisId: analysisResponse.body.analysisId,
        findingId: finding.findingId,
        status: 'good_catch',
      })
      .expect(201);

    expect(firstFeedback.body.analysisId).toBe(analysisResponse.body.analysisId);
    expect(firstFeedback.body.findingId).toBe(finding.findingId);
    expect(firstFeedback.body.status).toBe('good_catch');

    const storedFirst = getFindingFeedback(analysisResponse.body.analysisId, finding.findingId);
    expect(storedFirst).not.toBeNull();
    expect(storedFirst?.status).toBe('good_catch');

    const updatedFeedback = await request(app)
      .post('/api/v1/feedback')
      .send({
        analysisId: analysisResponse.body.analysisId,
        findingId: finding.findingId,
        status: 'false_positive',
        note: 'This pattern is accepted here.',
      })
      .expect(200);

    expect(updatedFeedback.body.status).toBe('false_positive');
    expect(updatedFeedback.body.note).toBe('This pattern is accepted here.');

    const storedUpdated = getFindingFeedback(analysisResponse.body.analysisId, finding.findingId);
    expect(storedUpdated).not.toBeNull();
    expect(storedUpdated?.status).toBe('false_positive');
    expect(storedUpdated?.note).toBe('This pattern is accepted here.');
  });
});

describe('E2E: GET /api/v1/feedback/summary/:analysisId', () => {
  it('returns feedback counts and the latest feedback record for a project analysis', async () => {
    const analysisResponse = await request(app)
      .post('/api/v1/projects/analyze')
      .send({
        profile: 'focused',
        files: [
          {
            path: 'src/summary.js',
            language: 'javascript',
            code: `
var counter = 0;
async function loadUser() {
  return 1;
}
if (counter == 1) {
  loadUser();
}
`,
          },
        ],
      })
      .expect(201);

    const [firstFinding, secondFinding] = analysisResponse.body.findings;
    expect(firstFinding).toBeDefined();
    expect(secondFinding).toBeDefined();

    await request(app)
      .post('/api/v1/feedback')
      .send({
        analysisId: analysisResponse.body.analysisId,
        findingId: firstFinding.findingId,
        status: 'good_catch',
      })
      .expect(201);

    await request(app)
      .post('/api/v1/feedback')
      .send({
        analysisId: analysisResponse.body.analysisId,
        findingId: secondFinding.findingId,
        status: 'false_positive',
        note: 'Intentional in this code path.',
      })
      .expect(201);

    const summaryResponse = await request(app)
      .get(`/api/v1/feedback/summary/${analysisResponse.body.analysisId}`)
      .expect(200);

    expect(summaryResponse.body.analysisId).toBe(analysisResponse.body.analysisId);
    expect(summaryResponse.body.summary.totalFindings).toBe(analysisResponse.body.findings.length);
    expect(summaryResponse.body.summary.reviewedFindings).toBe(2);
    expect(summaryResponse.body.summary.unreviewedFindings).toBe(
      analysisResponse.body.findings.length - 2
    );
    expect(summaryResponse.body.summary.goodCatchCount).toBe(1);
    expect(summaryResponse.body.summary.falsePositiveCount).toBe(1);
    expect(summaryResponse.body.summary.latestFeedback.status).toBe('false_positive');
    expect(summaryResponse.body.summary.feedback).toHaveLength(2);
  });
});
