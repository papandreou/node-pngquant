var os = require('os');

if (!os.tmpdir) {
    var fs = require('fs');
    os.tmpdir = function getTempDir() {
        // Memoized because those fs.realpathSync calls are expensive:
        if (!getTempDir.tmpDir) {
            var environmentVariableNames = ['TMPDIR', 'TMP', 'TEMP'];
            for (var i = 0 ; i < environmentVariableNames.length ; i += 1) {
                var environmentVariableValue = process.env[environmentVariableNames[i]];
                if (environmentVariableValue) {
                    getTempDir.tempDir = fs.realpathSync(environmentVariableValue);
                    break;
                }
            }
            if (!getTempDir.tempDir) {
                if (process.platform === 'win32') {
                    getTempDir.tempDir = fs.realpathSync('c:\\tmp');
                } else {
                    getTempDir.tempDir = fs.realpathSync('/tmp');
                }
            }
        }
        return getTempDir.tempDir;
    };
}

var childProcess = require('child_process'),
    Stream = require('stream').Stream,
    util = require('util'),
    binPath = require('pngquant-bin').path;

function PngQuant(pngQuantArgs) {
    Stream.call(this);

    if (!pngQuantArgs || pngQuantArgs.length === 0) {
        pngQuantArgs = [256];
    }

    this.writable = this.readable = true;
    this.pngQuantProcess = childProcess.spawn(binPath, pngQuantArgs);

    this.hasEnded = false;
    this.seenDataOnStdout = false;

    this.pngQuantProcess.stderr.on('data', function (data) {
        if (!this.hasEnded) {
            this.emit('error', new Error('Saw pngquant output on stderr: ' + data.toString('ascii')));
            this.hasEnded = true;
        }
    }.bind(this));

    this.pngQuantProcess.on('exit', function (exitCode) {
        if (exitCode > 0 && !this.hasEnded) {
            this.emit('error', new Error('The pngquant process exited with a non-zero exit code: ' + exitCode));
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
                this.emit('error', new Error('PngQuant: The stdout stream ended without emitting any data'));
            }
            this.hasEnded = true;
        }
    }.bind(this));
}

util.inherits(PngQuant, Stream);

PngQuant.prototype.write = function (chunk) {
    this.pngQuantProcess.stdin.write(chunk);
};

PngQuant.prototype.end = function (chunk) {
    if (chunk) {
        this.write(chunk);
    }
    this.pngQuantProcess.stdin.end();
};

PngQuant.prototype.pause = function () {
    this.pngQuantProcess.stdout.pause();
};

PngQuant.prototype.resume = function () {
    this.pngQuantProcess.stdout.resume();
};

module.exports = PngQuant;
