import { extname } from 'node:path';
import type { GeneratedFile } from '../types';

/** Kết thúc dòng theo đuôi file; đuôi không khai báo dùng LF. Windows cần CRLF cho .ps1 và .bat. */
export const EOL_BY_EXTENSION: Record<string, '\n' | '\r\n'> = {
  '.ps1': '\r\n',
  '.cmd': '\r\n',
};

export function applyEol(files: GeneratedFile[]): GeneratedFile[] {
  return files.map((file) => {
    const eol = EOL_BY_EXTENSION[extname(file.path)] ?? '\n';
    return {
      ...file,
      content: file.content.replace(/\r\n|\r|\n/g, eol),
    };
  });
}
