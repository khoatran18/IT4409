import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { inventorySample, schoolAdminSample, shopSample, type ProjectSchema } from '@codeflow/schema';
import { generate } from '../../../generator/pipeline';
import { generateWithoutValidation, kitchenSinkSample } from './fixtures';

// Test nặng (npm install + tsc + vite build, cần mạng): chỉ chạy khi RUN_FE_BUILD=1,
// dùng `pnpm --filter backend test:templates-fe`.
const enabled = process.env.RUN_FE_BUILD === '1';

// kitchen-sink có Grid, mà validator của backend chưa biết Grid nên phải bỏ qua bước validate
describe.each<[string, ProjectSchema, (schema: ProjectSchema) => ReturnType<typeof generate>]>([
  ['school-admin', schoolAdminSample, generate],
  ['inventory', inventorySample, generate],
  ['shop (quan hệ 1-n)', shopSample, generate],
  ['kitchen-sink (trang kéo thả đủ 11 component)', kitchenSinkSample, generateWithoutValidation],
])('app FE sinh ra từ schema %s', (_name, schema, generateFiles) => {
  let dir: string;

  beforeAll(async () => {
    if (!enabled) return;
    dir = mkdtempSync(join(tmpdir(), 'codeflow-fe-'));
    for (const file of await generateFiles(schema)) {
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
    const run = (cmd: string) => {
      try {
        return execSync(cmd, { cwd: dir, stdio: 'pipe', encoding: 'utf8' });
      } catch (e) {
        // tsc in lỗi ra stdout; đưa vào message để thấy ngay lỗi biên dịch của file sinh ra
        const { stdout, stderr } = e as { stdout?: string; stderr?: string };
        throw new Error(`${cmd} thất bại:\n${stdout ?? ''}${stderr ?? ''}`);
      }
    };
    run('npm install --prefer-offline --no-audit --no-fund');
    run('npx tsc --noEmit');
    run('npx vite build');
  }, 600_000);
});
