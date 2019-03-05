/* global describe, it, beforeEach, afterEach, setTimeout, __dirname */
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-stream'))
  .use(require('unexpected-sinon'));
const sinon = require('sinon');
const PngQuant = require('../lib/PngQuant');
const pathModule = require('path');
const fs = require('fs');
const semver = require('semver');

it.skipIf = function(condition) {
  (condition ? it.skip : it).apply(
    it,
    Array.prototype.slice.call(arguments, 1)
  );
};

describe('PngQuant', () => {
  it('should produce a smaller file with lower quality and ordered dithering', () =>
    expect(
      fs.createReadStream(
        pathModule.resolve(__dirname, 'purplealpha24bit.png')
      ),
      'when piped through',
      new PngQuant([128, '--quality', '60-80', '--nofs']),
      'to yield output satisfying',
      expect.it(resultPngBuffer => {
        expect(resultPngBuffer.length, 'to be within', 0, 8285);
      })
    ));

  it.skipIf(
    semver.satisfies(process.version.replace(/^v/, ''), '>=0.12.0'),
    'should not emit data events while paused',
    done => {
      const pngQuant = new PngQuant();

      function fail() {
        done(new Error('PngQuant emitted data while it was paused!'));
      }
      pngQuant.pause();
      pngQuant.on('data', fail).on('error', done);

      fs.createReadStream(
        pathModule.resolve(__dirname, 'purplealpha24bit.png')
      ).pipe(pngQuant);

      setTimeout(() => {
        pngQuant.removeListener('data', fail);
        const chunks = [];

        pngQuant
          .on('data', chunk => {
            chunks.push(chunk);
          })
          .on('end', () => {
            const resultPngBuffer = Buffer.concat(chunks);
            expect(resultPngBuffer.length, 'to be within', 0, 8285);
            done();
          });

        pngQuant.resume();
      }, 1000);
    }
  );

  it('should emit an error if an invalid image is processed', done => {
    const pngQuant = new PngQuant();

    pngQuant
      .on('error', () => {
        done();
      })
      .on('data', chunk => {
        done(new Error('PngQuant emitted data when an error was expected'));
      })
      .on('end', chunk => {
        done(new Error('PngQuant emitted end when an error was expected'));
      });

    pngQuant.end(Buffer.from('qwvopeqwovkqvwiejvq', 'utf-8'));
  });

  it('should emit a single error if an invalid command line is specified', done => {
    const pngQuant = new PngQuant(['--blabla']);

    let seenError = false;

    pngQuant
      .on('error', () => {
        expect(pngQuant.commandLine, 'to match', /pngquant --blabla/);
        if (seenError) {
          done(new Error('More than one error event was emitted'));
        } else {
          seenError = true;
          setTimeout(done, 100);
        }
      })
      .on('data', chunk => {
        done(new Error('PngQuant emitted data when an error was expected'));
      })
      .on('end', chunk => {
        done(new Error('PngQuant emitted end when an error was expected'));
      });

    pngQuant.end(Buffer.from('qwvopeqwovkqvwiejvq', 'utf-8'));
  });

  describe('#destroy', () => {
    it('should kill the underlying child process', () => {
      const pngQuant = new PngQuant(['-grayscale']);

      return expect.promise(run => {
        pngQuant.write('JFIF');
        setTimeout(
          run(function waitForPngQuantProcess() {
            const pngQuantProcess = pngQuant.pngQuantProcess;
            if (pngQuant.pngQuantProcess) {
              sinon.spy(pngQuantProcess, 'kill');
              pngQuant.destroy();
              sinon.spy(pngQuant, 'emit');
              expect(pngQuantProcess.kill, 'to have calls satisfying', () => {
                pngQuantProcess.kill();
              });
              expect(pngQuant.pngQuantProcess, 'to be falsy');
              expect(pngQuant.bufferedChunks, 'to be falsy');
              setTimeout(
                run(() => {
                  expect(pngQuant.emit, 'to have calls satisfying', []);
                }),
                10
              );
            } else {
              setTimeout(run(waitForPngQuantProcess), 0);
            }
          }),
          0
        );
      });
    });
  });

  expect.addAssertion('<Stream> to error', (expect, subject) =>
    expect.promise(run => {
      subject.once('error', run(err => err));
    })
  );

  expect.addAssertion(
    '<Stream> to error with <any>',
    (expect, subject, value) => {
      expect.errorMode = 'nested';
      return expect(subject, 'to error').then(err =>
        expect(err, 'to satisfy', value)
      );
    }
  );

  describe('with an overridden #binaryPath', () => {
    const childProcess = require('child_process');
    beforeEach(() => {
      PngQuant.getBinaryPath.purgeAll(); // Make sure we don't get a cached value from one of the other tests
      PngQuant.binaryPath = '/foo/bar';
      sinon.spy(childProcess, 'spawn');
    });
    afterEach(() => {
      PngQuant.binaryPath = null;
      childProcess.spawn.restore();
    });

    it('should try launching that binary instead of the one found on the system', () =>
      expect(
        fs.createReadStream(
          pathModule.resolve(__dirname, 'purplealpha24bit.png')
        ),
        'when piped through',
        new PngQuant([128]),
        'to error with',
        /\/foo\/bar ENOENT|write EPIPE/
      ));
  });
});
