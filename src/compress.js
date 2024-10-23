const sharp = require('sharp');
const redirect = require('./redirect');

// Configure sharp worker concurrency and cache settings
sharp.concurrency(1);
sharp.cache({ memory: 256, items: 2, files: 20 });

// Define sharpStream function for reusability
const sharpStream = () => sharp({ animated: false, unlimited: true });

async function compress(req, res, input) {
    const format = 'avif'; // Set the output format to WebP

    try {
        // Create a sharp instance and apply transformations
        const transform = sharpStream()
            .grayscale(req.params.grayscale) // Apply grayscale if specified
            .toFormat(format, {               // Convert image to WebP format
                quality: req.params.quality,   // Set the quality for compression
                effort: 0,                     // Use effort=0 for faster compression
            })
                              // Add image metadata to the output

        // Pipe the input stream through the transform, then collect it into a buffer
        const output = await input.body.pipe(transform).toBuffer();
        const info = (await sharp(output).metadata()).size;

        // Send compressed image as the response with appropriate headers  res.setHeader('content-type', 'image/' + format);
  res.setHeader('content-length', info);
  res.setHeader('x-original-size', req.params.originSize);
  res.setHeader('x-bytes-saved', req.params.originSize - info);
  res.status(200);
  res.write(output);
  res.end();
    } catch (err) {
        console.error('Compression error:', err);
        redirect(req, res); // Redirect on error
    }
}

module.exports = compress;
