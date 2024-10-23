"use strict";
/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
const sharp = require('sharp');
const redirect = require('./redirect');

// Configure sharp worker concurrency and cache settings
sharp.concurrency(1);
sharp.cache({ memory: 256, items: 2, files: 20 });

const sharpStream = () => sharp({ animated: false, unlimited: true });

function compress(req, res, input) {
  const format = 'avif';

  // Create the sharp stream and apply transformations
  const transformer = sharpStream()
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality,
      effort: 0
    });

  // Pipe the input stream through sharp, and handle the promise with `.then()` and `.catch()`
  input.data.pipe(transformer)
    .toBuffer()
    .then(outputBuffer => {
      const originSize = req.params.originSize;
      const compressedSize = outputBuffer.length;

      // Set headers based on the transformation
      res.setHeader('content-type', `image/${format}`);
      res.setHeader('content-length', compressedSize);
      res.setHeader('x-original-size', originSize);
      res.setHeader('x-bytes-saved', originSize - compressedSize);

      // Send the compressed image
      res.status(200);
      res.write(outputBuffer);
      res.end();
    })
    .catch(err => {
      console.error("Compression error:", err);
      redirect(req, res); // Handle error with redirection
    });
}

module.exports = compress;
