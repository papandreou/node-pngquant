node-pngquant
=============

The pngquant command line utility as a readable/writable stream.

The constructor optionally takes an array of command line options for
the `pngquant` binary (defaults to `[256]`):

```javascript
var PngQuant = require('pngquant'),
    myPngQuanter = new PngQuant([192, '-ordered']);

sourceStream.pipe(myPngQuanter).pipe(destinationStream);
```

PngQuant as a web service (sends back a png with the number of colors
quantized to 128):

```javascript
var PngQuant = require('pngquant'),
    http = require('http');

http.createServer(function (req, res) {
    if (req.headers['content-type'] === 'image/png') {
        res.writeHead(200, {'Content-Type': 'image/png'});
        req.pipe(new PngQuant([128])).pipe(res);
    } else {
        res.writeHead(400);
        res.end('Feed me a PNG!');
    }
}).listen(1337);
```

Installation
------------

Make sure you have node.js and npm installed, and that the `pngquant` binary is in your PATH, then run:

    npm install pngquant

License
-------

3-clause BSD license -- see the `LICENSE` file for details.
