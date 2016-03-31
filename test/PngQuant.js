/*global describe, it, setTimeout, __dirname*/
var expect = require('unexpected').clone()
    .use(require('unexpected-stream'))
    .use(require('unexpected-sinon'));
var sinon = require('sinon');
var PngQuant = require('../lib/PngQuant');
var pathModule = require('path');
var fs = require('fs');
var semver = require('semver');

it.skipIf = function (condition) {
    (condition ? it.skip : it).apply(it, Array.prototype.slice.call(arguments, 1));
};

describe('PngQuant', function () {
    it('should produce a smaller file', function () {
        return expect(
            fs.createReadStream(pathModule.resolve(__dirname, 'purplealpha24bit.png')),
            'when piped through',
            new PngQuant([128]),
            'to yield output satisfying',
            function (resultPngBuffer) {
                expect(resultPngBuffer.length, 'to be within', 0, 8285);
            }
        );
    });

    it.skipIf(semver.satisfies(process.version.replace(/^v/, ''), '>=0.12.0'), 'should not emit data events while paused', function (done) {
        var pngQuant = new PngQuant();

        function fail() {
            done(new Error('PngQuant emitted data while it was paused!'));
        }
        pngQuant.pause();
        pngQuant.on('data', fail).on('error', done);

        fs.createReadStream(pathModule.resolve(__dirname, 'purplealpha24bit.png')).pipe(pngQuant);

        setTimeout(function () {
            pngQuant.removeListener('data', fail);
            var chunks = [];

            pngQuant
                .on('data', function (chunk) {
                    chunks.push(chunk);
                })
                .on('end', function () {
                    var resultPngBuffer = Buffer.concat(chunks);
                    expect(resultPngBuffer.length, 'to be within', 0, 8285);
                    done();
                });

            pngQuant.resume();
        }, 1000);
    });

    it('should emit an error if an invalid image is processed', function (done) {
        var pngQuant = new PngQuant();

        pngQuant.on('error', function (err) {
            done();
        }).on('data', function (chunk) {
            done(new Error('PngQuant emitted data when an error was expected'));
        }).on('end', function (chunk) {
            done(new Error('PngQuant emitted end when an error was expected'));
        });

        pngQuant.end(new Buffer('qwvopeqwovkqvwiejvq', 'utf-8'));
    });

    it('should emit a single error if an invalid command line is specified', function (done) {
        var pngQuant = new PngQuant(['--blabla']),
            seenError = false;

        pngQuant.on('error', function (err) {
            expect(pngQuant.commandLine, 'to match', /pngquant --blabla/);
            if (seenError) {
                done(new Error('More than one error event was emitted'));
            } else {
                seenError = true;
                setTimeout(done, 100);
            }
        }).on('data', function (chunk) {
            done(new Error('PngQuant emitted data when an error was expected'));
        }).on('end', function (chunk) {
            done(new Error('PngQuant emitted end when an error was expected'));
        });

        pngQuant.end(new Buffer('qwvopeqwovkqvwiejvq', 'utf-8'));
    });

    describe('#destroy', function () {
        it('should kill the underlying child process', function () {
            var pngQuant = new PngQuant(['-grayscale']);

            return expect.promise(function (run) {
                pngQuant.write('JFIF');
                setTimeout(run(function waitForPngQuantProcess() {
                    var pngQuantProcess = pngQuant.pngQuantProcess;
                    if (pngQuant.pngQuantProcess) {
                        sinon.spy(pngQuantProcess, 'kill');
                        pngQuant.destroy();
                        sinon.spy(pngQuant, 'emit');
                        expect(pngQuantProcess.kill, 'to have calls satisfying', function () {
                            pngQuantProcess.kill();
                        });
                        expect(pngQuant.pngQuantProcess, 'to be falsy');
                        expect(pngQuant.bufferedChunks, 'to be falsy');
                        setTimeout(run(function () {
                            expect(pngQuant.emit, 'to have calls satisfying', []);
                        }), 10);
                    } else {
                        setTimeout(run(waitForPngQuantProcess), 0);
                    }
                }), 0);
            });
        });
    });
});
