import { ChildProcessWithoutNullStreams } from 'child_process';
import { Stream } from 'stream';

declare class PngQuant extends Stream {
  pngQuantArgs: string[];
  writable: boolean;
  readable: boolean;
  hasEnded: boolean;
  seenDataOnStdout: boolean;
  pngQuantProcess: ChildProcessWithoutNullStreams | null;
  bufferedChunks: Buffer[] | null;
  constructor(pngQuantArgs?: string[]);
  static getBinaryPath(cb: (err: Error | null, binaryPath?: string) => void): void;
  static setBinaryPath(binaryPath: string): void;
  private _error(err: Error): void;
  private cleanUp(): void;
  destroy(): void;
  write(chunk: Buffer | string): void;
  end(chunk?: Buffer | string): void;
  pause(): void;
  resume(): void;
}

export default PngQuant;
