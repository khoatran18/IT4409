import { zipSync, type Zippable } from 'fflate';
import type { GeneratedFile } from '../types';

/** Thời gian cố định (DOS date 1980-01-01) để cùng nội dung cho cùng byte zip */
const FIXED_MTIME = new Date(1980, 0, 1);
const UNIX = 3;

/** Script `.sh` được đánh dấu thực thi; một số công cụ giải nén sẽ giữ bit này */
function mode(path: string): number {
  return path.endsWith('.sh') ? 0o100755 : 0o100644;
}

/** Mọi file nằm trong một thư mục gốc `rootDir/`; thứ tự theo thứ tự `files`. */
export function toZip(files: GeneratedFile[], rootDir: string): Uint8Array {
  const entries: Zippable = {};
  for (const file of files) {
    entries[`${rootDir}/${file.path}`] = [
      Buffer.from(file.content, 'utf8'),
      {
        level: 6,
        mtime: FIXED_MTIME,
        os: UNIX,
        attrs: (mode(file.path) << 16) >>> 0,
      },
    ];
  }
  return zipSync(entries);
}
