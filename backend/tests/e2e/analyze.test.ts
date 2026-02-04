import request from 'supertest';
import app from '../../src/index';

describe('E2E: POST /api/analyze', () => {
  it('analyzes JavaScript code and returns mistakes', async () => {
    const code = `
// Sample code with multiple issues
var name = 'test';

async function fetchData() {
  return { data: 'test' };
}

async function main() {
  fetchData();  // Missing await
  
  if (x == 5) {  // Double equals
    console.log('found');  // Console left
  }
  
  try {
    riskyOperation();
  } catch (e) {
    // Empty catch
  }
}
`;

    const response = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'javascript' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('mistakes');
    expect(response.body).toHaveProperty('score');
    expect(Array.isArray(response.body.mistakes)).toBe(true);
    expect(typeof response.body.score).toBe('number');
    expect(response.body.score).toBeLessThanOrEqual(10);
    expect(response.body.score).toBeGreaterThanOrEqual(0);

    // Check that we detected the expected issues
    const mistakeNames = response.body.mistakes.map((m: any) => m.name);
    expect(mistakeNames).toContain('var_usage');
    expect(mistakeNames).toContain('missing_await');
    expect(mistakeNames).toContain('double_equals');
    expect(mistakeNames).toContain('console_log_left');
    expect(mistakeNames).toContain('empty_catch');

    // Verify mistake structure
    const firstMistake = response.body.mistakes[0];
    expect(firstMistake).toHaveProperty('id');
    expect(firstMistake).toHaveProperty('name');
    expect(firstMistake).toHaveProperty('line');
    expect(firstMistake).toHaveProperty('column');
    expect(firstMistake).toHaveProperty('severity');
    expect(firstMistake).toHaveProperty('certainty');
    expect(firstMistake).toHaveProperty('confidence');
    expect(firstMistake).toHaveProperty('scope');
    expect(firstMistake).toHaveProperty('message');
    expect(firstMistake).toHaveProperty('ast_facts');
    expect(firstMistake).toHaveProperty('explanation');
    expect(firstMistake).toHaveProperty('fix');
  });

  it('analyzes TypeScript code', async () => {
    const code = `
interface User {
  name: string;
}

async function getUser(): Promise<User> {
  return { name: 'John' };
}

async function main() {
  getUser();  // Missing await
}
`;

    const response = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'typescript' })
      .expect(200);

    expect(response.body.mistakes.length).toBeGreaterThan(0);
    expect(response.body.mistakes.some((m: any) => m.name === 'missing_await')).toBe(true);
  });

  it('analyzes Python code', async () => {
    const code = `
def process(data):
    x = None
    print(x.value)  # Nullable access
    
    try:
        risky()
    except:
        pass  # Empty catch
`;

    const response = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'python' })
      .expect(200);

    expect(response.body).toHaveProperty('mistakes');
    expect(response.body).toHaveProperty('score');
  });

  it('returns clean code score for good code', async () => {
    const code = `
const items = [1, 2, 3];

for (let i = 0; i < items.length; i++) {
  console.log(items[i]);
}
`;

    const response = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'javascript' })
      .expect(200);

    // May have console.log detection, but should be minimal
    expect(response.body.score).toBeGreaterThanOrEqual(5);
  });

  it('returns 400 for missing code', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({ language: 'javascript' })
      .expect(400);

    expect(response.body.error).toContain('code');
  });

  it('returns 400 for invalid language', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({ code: 'const x = 1;', language: 'ruby' })
      .expect(400);

    expect(response.body.error).toContain('language');
  });

  it('returns deterministic results for same input', async () => {
    const code = `
var x = 1;
if (x == 2) {
  console.log('test');
}
`;

    const response1 = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'javascript' })
      .expect(200);

    const response2 = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'javascript' })
      .expect(200);

    expect(response1.body.mistakes.length).toBe(response2.body.mistakes.length);
    expect(response1.body.score).toBe(response2.body.score);

    // Check that explanations are identical
    for (let i = 0; i < response1.body.mistakes.length; i++) {
      expect(response1.body.mistakes[i].explanation).toBe(
        response2.body.mistakes[i].explanation
      );
      expect(response1.body.mistakes[i].fix).toBe(response2.body.mistakes[i].fix);
    }
  });

  it('handles syntax errors gracefully', async () => {
    const code = `
function broken( {
  // Missing closing paren
}
`;

    const response = await request(app)
      .post('/api/analyze')
      .send({ code, language: 'javascript' })
      .expect(200);

    // Should still return a response, possibly with errors or empty results
    expect(response.body).toHaveProperty('mistakes');
  });
});

describe('E2E: Health Check', () => {
  it('returns healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});

describe('E2E: POST /api/save and GET /api/snippet/:id', () => {
  it('saves a snippet and retrieves it', async () => {
    const code = 'const x = 1;';
    const language = 'javascript';
    const results = {
      mistakes: [
        {
          id: 1,
          name: 'test_mistake',
          line: 1,
          column: 1,
          severity: 'warning' as const,
          certainty: 'possible' as const,
          confidence: 0.5,
          scope: 'function' as const,
          message: 'Test message',
          ast_facts: { test: true },
          explanation: 'Test explanation',
          fix: 'Test fix',
        },
      ],
      score: 9,
    };

    // Save the snippet
    const saveResponse = await request(app)
      .post('/api/save')
      .send({ code, language, results })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(saveResponse.body).toHaveProperty('id');
    expect(typeof saveResponse.body.id).toBe('string');
    expect(saveResponse.body.id.length).toBeGreaterThan(0);

    const snippetId = saveResponse.body.id;

    // Retrieve the snippet
    const getResponse = await request(app)
      .get(`/api/snippet/${snippetId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(getResponse.body.id).toBe(snippetId);
    expect(getResponse.body.code).toBe(code);
    expect(getResponse.body.language).toBe(language);
    expect(getResponse.body.results).toEqual(results);
    expect(getResponse.body).toHaveProperty('created_at');
  });

  it('returns 400 for missing code in save', async () => {
    const response = await request(app)
      .post('/api/save')
      .send({ language: 'javascript', results: { mistakes: [], score: 10 } })
      .expect(400);

    expect(response.body.error).toContain('code');
  });

  it('returns 400 for missing results in save', async () => {
    const response = await request(app)
      .post('/api/save')
      .send({ code: 'const x = 1;', language: 'javascript' })
      .expect(400);

    expect(response.body.error).toContain('results');
  });

  it('returns 400 for invalid language in save', async () => {
    const response = await request(app)
      .post('/api/save')
      .send({ 
        code: 'const x = 1;', 
        language: 'ruby', 
        results: { mistakes: [], score: 10 } 
      })
      .expect(400);

    expect(response.body.error).toContain('language');
  });

  it('returns 404 for non-existent snippet', async () => {
    const response = await request(app)
      .get('/api/snippet/nonexistent123')
      .expect(404);

    expect(response.body.error).toContain('not found');
  });
});
