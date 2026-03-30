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
