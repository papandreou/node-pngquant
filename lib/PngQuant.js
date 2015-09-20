var childProcess = require('child_process'),
    Stream = require('stream').Stream,
    util = require('util'),
    which = require('which'),
    memoizeAsync = require('memoizeasync');

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

PngQuant.getBinaryPath = memoizeAsync(function (cb) {
    which('pngquant', function (err, pngQuantBinaryPath) {
        if (err) {
            pngQuantBinaryPath = require('pngquant-bin');
        }
        if (pngQuantBinaryPath) {
            cb(null, pngQuantBinaryPath);
        } else {
            cb(new Error('No pngquant binary in PATH and pngquant-bin does not provide a pre-built binary for your architecture'));
        }
    });
});

PngQuant.prototype._reportError = function (err) {
    if (!this.hasEnded) {
        this.hasEnded = true;
        this.emit('error', err);
    }
};

PngQuant.prototype.write = function (chunk) {
    if (!this.pngQuantProcess && !this.bufferedChunks) {
        this.bufferedChunks = [];
        PngQuant.getBinaryPath(function (err, pngCrushBinaryPath) {
            if (err) {
                return this.emit('error', err);
            }
            this.commandLine = pngCrushBinaryPath + (this.pngQuantArgs ? ' ' + this.pngQuantArgs.join(' ') : ''); // For debugging
            this.pngQuantProcess = childProcess.spawn(pngCrushBinaryPath, this.pngQuantArgs);
            this.pngQuantProcess.on('error', this._reportError.bind(this));
            this.pngQuantProcess.stdin.on('error', this._reportError.bind(this));
            this.pngQuantProcess.stdout.on('error', this._reportError.bind(this));

            this.pngQuantProcess.stderr.on('data', function (data) {
                if (!this.hasEnded) {
                    this._reportError(new Error('Saw pngquant output on stderr: ' + data.toString('ascii')));
                    this.hasEnded = true;
                }
            }.bind(this));

            this.pngQuantProcess.on('exit', function (exitCode) {
                if (exitCode > 0 && !this.hasEnded) {
                    this._reportError(new Error('The pngquant process exited with a non-zero exit code: ' + exitCode));
                    this.hasEnded = true;
                }
            }.bind(this));

            this.pngQuantProcess.stdout.on('data', function (chunk) {
                this.seenDataOnStdout = true;
                this.emit('data', chunk);
            }.bind(this)).on('end', function () {
                if (!this.hasEnded) {
                    if (this.seenDataOnStdout) {
                        this.emit('end');
                    } else {
                        this._reportError(new Error('PngQuant: The stdout stream ended without emitting any data'));
                    }
                    this.hasEnded = true;
                }
            }.bind(this));

            if (this.pauseStdoutOfPngQuantProcessAfterStartingIt) {
                this.pngQuantProcess.stdout.pause();
            }
            this.bufferedChunks.forEach(function (bufferedChunk) {
                if (bufferedChunk === null) {
                    this.pngQuantProcess.stdin.end();
                } else {
                    this.pngQuantProcess.stdin.write(bufferedChunk);
                }
            }, this);
            this.bufferedChunks = null;
        }.bind(this));
    }
    if (this.bufferedChunks) {
        this.bufferedChunks.push(chunk);
    } else {
        this.pngQuantProcess.stdin.write(chunk);
    }
};

PngQuant.prototype.end = function (chunk) {
    if (chunk) {
        this.write(chunk);
    } else if (!this.pngQuantProcess) {
        // No chunks have been rewritten. Write an empty one to make sure there's pngquant process.
        this.write(new Buffer(0));
    }
    if (this.bufferedChunks) {
        this.bufferedChunks.push(null);
    } else {
        this.pngQuantProcess.stdin.end();
    }
};

PngQuant.prototype.pause = function () {
    if (this.pngQuantProcess) {
        this.pngQuantProcess.stdout.pause();
    } else {
        this.pauseStdoutOfPngQuantProcessAfterStartingIt = true;
    }
};

PngQuant.prototype.resume = function () {
    if (this.pngQuantProcess) {
        this.pngQuantProcess.stdout.resume();
    } else {
        this.pauseStdoutOfPngQuantProcessAfterStartingIt = false;
    }
};

module.exports = PngQuant;
