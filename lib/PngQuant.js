/* jshint node: true */
const childProcess = require('child_process');
const Stream = require('stream').Stream;
const util = require('util');
const which = require('which');
const memoizeAsync = require('memoizeasync');

function PngQuant(pngQuantArgs) {
  Stream.call(this);

  this.pngQuantArgs = pngQuantArgs;

  if (!this.pngQuantArgs || this.pngQuantArgs.length === 0) {
    this.pngQuantArgs = [256];
  }

  this.writable = this.readable = true;

  this.hasEnded = false;
  this.seenDataOnStdout = false;
}

util.inherits(PngQuant, Stream);

PngQuant.getBinaryPath = memoizeAsync(cb => {
  if (PngQuant.binaryPath !== undefined) {
    setImmediate(() => {
      cb(null, PngQuant.binaryPath);
    });
    return;
  }

  which('pngquant', (err, pngQuantBinaryPath) => {
    if (err) {
      pngQuantBinaryPath = require('pngquant-bin');
    }
    if (pngQuantBinaryPath) {
      cb(null, pngQuantBinaryPath);
    } else {
      cb(
        new Error(
          'No pngquant binary in PATH and pngquant-bin does not provide a pre-built binary for your architecture'
        )
      );
    }
  });
});

PngQuant.setBinaryPath = binaryPath => {
  PngQuant.binaryPath = binaryPath;
};

PngQuant.prototype._error = function(err) {
  if (!this.hasEnded) {
    this.hasEnded = true;
    this.cleanUp();
    this.emit('error', err);
  }
};

PngQuant.prototype.cleanUp = function() {
  if (this.pngQuantProcess) {
    this.pngQuantProcess.kill();
    this.pngQuantProcess = null;
  }
  this.bufferedChunks = null;
};

PngQuant.prototype.destroy = function() {
  if (!this.hasEnded) {
    this.hasEnded = true;
    this.cleanUp();
    this.bufferedChunks = null;
  }
};

PngQuant.prototype.write = function(chunk) {
  if (this.hasEnded) {
    return;
  }
  if (!this.pngQuantProcess && !this.bufferedChunks) {
    this.bufferedChunks = [];
    PngQuant.getBinaryPath((err, pngCrushBinaryPath) => {
      if (this.hasEnded) {
        return;
      }
      if (err) {
        return this._error(err);
      }
      this.commandLine =
        pngCrushBinaryPath +
        (this.pngQuantArgs ? ` ${this.pngQuantArgs.join(' ')}` : ''); // For debugging
      this.pngQuantProcess = childProcess.spawn(
        pngCrushBinaryPath,
        this.pngQuantArgs
      );
      this.pngQuantProcess.once('error', this._error.bind(this));
      this.pngQuantProcess.stdin.once('error', this._error.bind(this));
      this.pngQuantProcess.stdout.once('error', this._error.bind(this));

      this.pngQuantProcess.stderr.on('data', data => {
        if (!this.hasEnded) {
          this._error(
            new Error(
              `Saw pngquant output on stderr: ${data.toString('ascii')}`
            )
          );
          this.hasEnded = true;
        }
      });

      this.pngQuantProcess.once('exit', exitCode => {
        if (this.hasEnded) {
          return;
        }
        if (exitCode > 0 && !this.hasEnded) {
          this._error(
            new Error(
              `The pngquant process exited with a non-zero exit code: ${exitCode}`
            )
          );
          this.hasEnded = true;
        }
      });

      this.pngQuantProcess.stdout
        .on('data', chunk => {
          this.seenDataOnStdout = true;
          this.emit('data', chunk);
        })
        .once('end', () => {
          this.pngQuantProcess = null;
          if (!this.hasEnded) {
            if (this.seenDataOnStdout) {
              this.emit('end');
            } else {
              this._error(
                new Error(
                  'PngQuant: The stdout stream ended without emitting any data'
                )
              );
            }
            this.hasEnded = true;
          }
        });

      if (this.pauseStdoutOfPngQuantProcessAfterStartingIt) {
        this.pngQuantProcess.stdout.pause();
      }
      this.bufferedChunks.forEach(function(bufferedChunk) {
        if (bufferedChunk === null) {
          this.pngQuantProcess.stdin.end();
        } else {
          this.pngQuantProcess.stdin.write(bufferedChunk);
        }
      }, this);
      this.bufferedChunks = null;
    });
  }
  if (this.bufferedChunks) {
    this.bufferedChunks.push(chunk);
  } else {
    this.pngQuantProcess.stdin.write(chunk);
  }
};

PngQuant.prototype.end = function(chunk) {
  if (this.hasEnded) {
    return;
  }
  if (chunk) {
    this.write(chunk);
  } else if (!this.pngQuantProcess) {
    // No chunks have been rewritten. Write an empty one to make sure there's pngquant process.
    this.write(Buffer.from([]));
  }
  if (this.bufferedChunks) {
    this.bufferedChunks.push(null);
  } else {
    this.pngQuantProcess.stdin.end();
  }
};

PngQuant.prototype.pause = function() {
  if (this.pngQuantProcess) {
    this.pngQuantProcess.stdout.pause();
  } else {
    this.pauseStdoutOfPngQuantProcessAfterStartingIt = true;
  }
};

PngQuant.prototype.resume = function() {
  if (this.pngQuantProcess) {
    this.pngQuantProcess.stdout.resume();
  } else {
    this.pauseStdoutOfPngQuantProcessAfterStartingIt = false;
  }
};

module.exports = PngQuant;
