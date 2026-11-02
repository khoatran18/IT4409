import type { GeneratedFile } from '../types';
import { applyEol } from './eol';

/** Chuẩn hóa EOL và sắp xếp theo đường dẫn để đầu ra xác định. */
export function pack(files: GeneratedFile[]): GeneratedFile[] {
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path))
      throw new Error(`Hai template cùng sinh ra file ${file.path}`);
    seen.add(file.path);
  }
  return applyEol(files).sort((a, b) => (a.path < b.path ? -1 : 1));
}
