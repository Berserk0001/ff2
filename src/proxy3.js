"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const axiosrequest = require('axios').get;
const pick = require('lodash').pick;
const shouldCompress = require('./shouldCompress');
const redirect = require('./redirect');
const compress = require('./compress1');
const copyHeaders = require('./copyHeaders');

function proxy(req, res) {
  
  
  // Fetch remote resource as a stream using axios
  axiosrequest(req.params.url, {
    responseType: 'stream', // Ensure the response is streamed
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
      "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
      via: "1.1 bandwidth-hero"
    },
    decompress: false,
    maxRedirects: 5 // Similar to undici's maxRedirections option
  })
  .then(origin => {
    // Handle non-success status codes
    if (origin.status >= 400) {
      return redirect(req, res);
    }

    // Handle redirects
    if (origin.status >= 300 && origin.headers.location) {
      return redirect(req, res);
    }

     // Stream the response data
    copyHeaders(origin, res);

    // Set required headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('content-encoding', 'identity');

    req.params.originType = origin.headers['content-type'] || '';
    req.params.originSize = origin.headers['content-length'], 10 || 0;

    // Handle stream errors
    origin.data.on('error', () => req.socket.destroy());

    // Check if the response should be compressed
    if (shouldCompress(req)) {
      // Compress the response stream
      compress(req, res, origin);
    } else {
      // Bypass compression and pipe the original stream directly to the client
      res.setHeader("x-proxy-bypass", 1);

      // Forward necessary headers
      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in origin.headers) {
          res.setHeader(headerName, origin.headers[headerName]);
        }
      }

      // Pipe the original response stream to the client
      origin.data.pipe(res);
    }
  })
  .catch(err => {
    // Handle invalid URL errors
    if (err.code === "ERR_INVALID_URL") {
      return res.status(400).send("Invalid URL");
    }

    // Handle other errors by redirecting and destroying the socket
    redirect(req, res);
    console.error('Error in proxy:', err);
  });
}

module.exports = proxy;
