var childProcess = require('child_process'),
    Stream = require('stream').Stream,
    util = require('util');

function PngQuant(pngQuantArgs) {
    Stream.call(this);

    if (!pngQuantArgs || pngQuantArgs.length === 0) {
        pngQuantArgs = [256];
    }

    this.writable = this.readable = true;

    this.pngQuantProcess = childProcess.spawn('pngquant', pngQuantArgs);

    this.hasEnded = false;

    this.pngQuantProcess.on('exit', function (exitCode) {
        if (exitCode > 0 && !this.hasEnded) {
            return this.emit('error', new Error('The pngquant process exited with a non-zero exit code: ' + exitCode));
            this.hasEnded = true;
        }
    }.bind(this));

    this.pngQuantProcess.stdout.on('data', function (chunk) {
        this.emit('data', chunk);
    }.bind(this)).on('end', function () {
        if (!this.hasEnded) {
            this.emit('end');
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
