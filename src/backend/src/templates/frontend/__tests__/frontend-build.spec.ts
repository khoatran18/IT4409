import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inventorySample, schoolAdminSample } from '@codeflow/schema';
import { generate } from '../../../generator/pipeline';

// Test nặng (npm install + tsc + vite build, cần mạng): chỉ chạy khi RUN_FE_BUILD=1,
// dùng `pnpm --filter backend test:templates-fe`.
const enabled = process.env.RUN_FE_BUILD === '1';

describe.each([
  ['school-admin', schoolAdminSample],
  ['inventory', inventorySample],
])('app FE sinh ra từ schema %s', (_name, schema) => {
  let dir: string;

  beforeAll(async () => {
    if (!enabled) return;
    dir = mkdtempSync(join(tmpdir(), 'codeflow-fe-'));
    for (const file of await generate(schema)) {
      if (!file.path.startsWith('frontend/')) continue;
      const out = join(dir, file.path.replace(/^frontend\//, ''));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, file.content);
    }
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  (enabled ? it : it.skip)('npm install, tsc --noEmit và vite build đều thành công', () => {
    const run = (cmd: string) => execSync(cmd, { cwd: dir, stdio: 'pipe', encoding: 'utf8' });
    run('npm install --prefer-offline --no-audit --no-fund');
    run('npx tsc --noEmit');
    run('npx vite build');
  }, 600_000);
});
