import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { log } from '../log';

/**
 * Document storage.
 *
 * Patient documents (discharge summaries, prescriptions, reports) are the most sensitive
 * data this platform holds, so two rules are structural rather than conventional:
 *   1. Nothing is written under `public/` — the local driver writes to a directory
 *      outside the web root, so there is no URL that serves a file without an auth check.
 *   2. Reads go through `read()` from an authorised route handler, never a redirect to a
 *      storage URL, so access is checked per request and recorded.
 */

const ALLOWED_MIME: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/heic': ['heic'],
};

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Magic bytes for the allowed types, so a renamed executable is rejected. */
const SIGNATURES: { mime: string; bytes: number[]; offset: number }[] = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: 'image/webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
];

export type ValidationFailure = { ok: false; reason: string };
export type ValidationSuccess = { ok: true; extension: string };

export function validateUpload(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  head: Uint8Array;
}): ValidationFailure | ValidationSuccess {
  if (input.sizeBytes <= 0) return { ok: false, reason: 'The file appears to be empty.' };
  if (input.sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, reason: 'Files must be 15 MB or smaller.' };
  }

  const allowedExtensions = ALLOWED_MIME[input.mimeType];
  if (!allowedExtensions) {
    return { ok: false, reason: 'Only PDF and image files (JPG, PNG, WEBP, HEIC) are accepted.' };
  }

  const extension = input.fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!allowedExtensions.includes(extension)) {
    return { ok: false, reason: 'The file extension does not match its type.' };
  }

  // HEIC has no simple stable signature; the extension + MIME pair is as far as we go.
  const signature = SIGNATURES.find((s) => s.mime === input.mimeType);
  if (signature) {
    const slice = input.head.slice(signature.offset, signature.offset + signature.bytes.length);
    const matches = signature.bytes.every((byte, index) => slice[index] === byte);
    if (!matches) {
      return { ok: false, reason: 'The file contents do not match the declared file type.' };
    }
  }

  return { ok: true, extension };
}

export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

/** Development driver. Writes outside the Next.js public directory by design. */
class LocalDriver implements StorageDriver {
  readonly name = 'local';
  private root = path.join(process.cwd(), 'private-uploads');

  private resolve(key: string): string {
    // Defends against `../` in a key even though keys are generated server-side.
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root)) throw new Error('Invalid storage key.');
    return target;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { mode: 0o600 });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.resolve(key)).catch(() => undefined);
  }
}

/**
 * Placeholder for the production driver. Left unimplemented rather than half-implemented:
 * a bucket write that silently no-ops would be worse than a clear failure.
 */
class S3Driver implements StorageDriver {
  readonly name = 's3';
  async put(): Promise<void> {
    throw new Error(
      'The S3 storage driver is not implemented yet. Set STORAGE_DRIVER=local or implement this driver against the contracted bucket.',
    );
  }
  async read(): Promise<Buffer> {
    throw new Error('The S3 storage driver is not implemented yet.');
  }
  async remove(): Promise<void> {
    throw new Error('The S3 storage driver is not implemented yet.');
  }
}

export function storage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? 'local';
  if (driver === 's3') return new S3Driver();
  if (driver !== 'local') log.warn('storage.driver.unknown', { driver });
  return new LocalDriver();
}

/** Opaque, non-guessable key that carries no patient identity. */
export function storageKey(seniorId: string, extension: string): string {
  const shard = createHash('sha256').update(seniorId).digest('hex').slice(0, 2);
  return `${shard}/${randomUUID()}.${extension}`;
}
