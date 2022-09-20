# node-pngquant

[![NPM version](https://badge.fury.io/js/pngquant.svg)](http://badge.fury.io/js/pngquant)
[![Build Status](https://travis-ci.org/papandreou/node-pngquant.svg?branch=master)](https://travis-ci.org/papandreou/node-pngquant)
[![Coverage Status](https://coveralls.io/repos/papandreou/node-pngquant/badge.svg)](https://coveralls.io/r/papandreou/node-pngquant)
[![Dependency Status](https://david-dm.org/papandreou/node-pngquant.svg)](https://david-dm.org/papandreou/node-pngquant)

The pngquant command line utility as a readable/writable stream.

The constructor optionally takes an array of command line options for
the `pngquant` binary (defaults to `[256]`):

```javascript
import PngQuant from 'pngquant';

const myPngQuanter = new PngQuant([192, '--quality', '60-80', '--nofs', '-']);

sourceStream.pipe(myPngQuanter).pipe(destinationStream);
```

PngQuant as a web service (sends back a png with the number of colors
quantized to 128):

```javascript
import PngQuant from 'pngquant';
import http from 'http';

http
  .createServer(function (req, res) {
    if (req.headers['content-type'] === 'image/png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      req.pipe(new PngQuant([128])).pipe(res);
    } else {
      res.writeHead(400);
      res.end('Feed me a PNG!');
    }
  })
  .listen(1337);
```

## Installation

Make sure you have node.js and npm installed, and that the `pngquant` binary is in your PATH, then run:

```
npm install pngquant
```

# Releases

See the [changelog](CHANGELOG.md).

## License

3-clause BSD license -- see the `LICENSE` file for details.
