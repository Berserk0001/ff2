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

  /*
   * Determine the uncompressed image size when there's no content-length header.
   */

  /*
   * input.pipe => sharp (The compressor) => Send to httpResponse
   * The following headers:
   * |  Header Name  |            Description            |           Value            |
   * |---------------|-----------------------------------|----------------------------|
   * |x-original-size|Original photo size                |OriginSize                  |
   * |x-bytes-saved  |Saved bandwidth from original photo|OriginSize - Compressed Size|
   */
  
  input.data.pipe(
    sharpStream()
      .grayscale(req.params.grayscale)
      .toFormat(format, {
        quality: req.params.quality,
        effort: 0,
      })
  )
  .toBuffer()
  .then((output) => {
    const info = sharp.info(output); // Retrieve info manually from the buffer
    if (!info) {
      throw new Error('Compression failed');
    }

    res.setHeader('content-type', 'image/' + format);
    res.setHeader('content-length', info.size);
    res.setHeader('x-original-size', req.params.originSize);
    res.setHeader('x-bytes-saved', req.params.originSize - info.size);
    res.status(200).send(output);
  })
  .catch((err) => {
    console.error('Error during compression:', err);
    return redirect(req, res);
  });
}

module.exports = compress;
