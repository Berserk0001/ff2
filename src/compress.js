const sharp = require('sharp');
const redirect = require('./redirect');

// Configure sharp worker concurrency and caching
const worker = sharp;
worker.concurrency(1); // Increased to 2 for better performance if the server can handle it
worker.cache(false);

 async function compress(req, reply, input) {
    const format = 'webp'; // Only use WebP format
   // console.log("QUEUE:: ", worker.counters());
   // console.log(`[COMPRESS] BEGIN: compressing file`);

    await input.pipe(worker({ unlimited: true })
        .grayscale(req.params.grayscale)
        .toFormat(format, {
            quality: req.params.quality,
           // bitdepth: 8,
          // compression: 'av1',
         //   progressive: true,
          //  optimizeScans: true,
            effort: 0 // Adjust effort for a balance between speed and quality
        }))
        .toBuffer()
        .then( async(output) => {
            const metadata = await sharp(output).metadata();
           // console.log(`[COMPRESS] OK: compressed file sent`);
            reply
                .header('content-type', `image/${format}`)
                .header('content-length', metadata.size)
                .header('x-original-size', req.params.originSize)
                .header('x-bytes-saved', req.params.originSize - metadata.size)
                .code(200)
                
                .send(output);
        })
        .catch(err => {
            console.error('Compression error:', { error: err, requestId: req.id }); // More detailed error logging
            redirect(req, reply);
            if (input) input.destroy(); // Ensure stream is destroyed on error
        });
}

module.exports = compress;
