var childProcess = require('child_process'),
    Stream = require('stream').Stream,
    util = require('util'),
    pngQuantBin;

try {
    pngQuantBin = require('pngquant-bin');
} catch (e) {}

var binPath = pngQuantBin ? pngQuantBin.path : 'pngquant';

function PngQuant(pngQuantArgs) {
    Stream.call(this);

    if (!pngQuantArgs || pngQuantArgs.length === 0) {
        pngQuantArgs = [256];
    }

    this.writable = this.readable = true;
    this.pngQuantProcess = childProcess.spawn(binPath, pngQuantArgs);

    this.hasEnded = false;
    this.seenDataOnStdout = false;

    this.pngQuantProcess.on('error', function (err) {
        this.emit('error', err);
    }.bind(this));

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
