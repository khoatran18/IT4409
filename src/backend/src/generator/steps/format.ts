import { extname } from 'node:path';
import { format as prettierFormat, type Options } from 'prettier';
import type { GeneratedFile } from '../types';

const PARSERS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'babel',
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
};

/** Cố định để đầu ra không phụ thuộc file cấu hình của máy đang chạy */
const OPTIONS: Options = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 80,
};

/** File không có parser, hoặc parser báo lỗi, được giữ nguyên. */
export async function formatFiles(
  files: GeneratedFile[],
): Promise<GeneratedFile[]> {
  return Promise.all(
    files.map(async (file) => {
      const parser = PARSERS[extname(file.path)];
      if (!parser) return file;
      try {
        const content = await prettierFormat(file.content, {
          ...OPTIONS,
          parser,
        });
        return { ...file, content };
      } catch {
        return file;
      }
    }),
  );
}
