import type { Stream } from 'stream';

interface PngQuant extends Stream {
  new (args?: Array<string | number>): PngQuant;
  binaryPath: string;
  getBinaryPath: (callback: (err: Error, binaryPath: string) => void) => void;
  setBinaryPath: (binaryPath: string) => void;
  _error: (err: Error) => void;
  cleanUp: () => void;
  destroy: () => void;
  write: (chunk: Buffer) => void;
  end: (chunk: Buffer) => void;
  pause: () => void;
  resume: () => void;
}

export default PngQuant;
