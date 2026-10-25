import type { GeneratedFile } from '../types';

/** Sắp xếp theo đường dẫn để đầu ra xác định; nén zip sẽ thêm ở bước sau. */
export function pack(files: GeneratedFile[]): GeneratedFile[] {
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path))
      throw new Error(`Hai template cùng sinh ra file ${file.path}`);
    seen.add(file.path);
  }
  return [...files].sort((a, b) => (a.path < b.path ? -1 : 1));
}
