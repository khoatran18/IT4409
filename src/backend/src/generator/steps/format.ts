import type { GeneratedFile } from '../types';

/** Bản đầu: chỉ đảm bảo file kết thúc bằng một dòng trống, chưa format theo parser. */
export function formatFiles(files: GeneratedFile[]): GeneratedFile[] {
  return files.map((file) => ({
    ...file,
    content: file.content.endsWith('\n') ? file.content : `${file.content}\n`,
  }));
}
