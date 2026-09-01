/**
 * Runs an `npx` command cross-platform.
 *
 * On Windows npx is `npx.cmd`, and Node's execFile cannot launch a .cmd without a shell —
 * `execFileSync('npx', …)` throws ENOENT there. Every script that shells out to Prisma
 * goes through here so that only one place has to know this.
 */
import { execFileSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

export function npx(args, options = {}) {
  return execFileSync(isWindows ? 'npx.cmd' : 'npx', args, {
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  });
}
