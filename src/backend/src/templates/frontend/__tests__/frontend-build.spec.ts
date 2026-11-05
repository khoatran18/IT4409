import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { buildContext, listTemplates, render, root } from './render-helper';

// Test nặng (npm install + tsc + vite build, cần mạng): chỉ chạy khi RUN_FE_BUILD=1,
// dùng `pnpm --filter backend test:templates-fe`.
const enabled = process.env.RUN_FE_BUILD === '1';

(enabled ? describe : describe.skip)('app FE sinh ra build được', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'codeflow-fe-'));
    const context = buildContext();
    for (const file of listTemplates(root)) {
      const out = join(dir, relative(root, file).replace(/\.hbs$/, ''));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, render(file, context));
    }
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('npm install, tsc --noEmit và vite build đều thành công', () => {
    const run = (cmd: string) => execSync(cmd, { cwd: dir, stdio: 'pipe', encoding: 'utf8' });
    run('npm install --prefer-offline --no-audit --no-fund');
    run('npx tsc --noEmit');
    run('npx vite build');
  }, 600_000);
});
