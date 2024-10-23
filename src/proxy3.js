"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const axios = require('axios');
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress1");
const copyHeaders = require("./copyHeaders");

async function proxy(req, res) {
  let responseStream;
  
  // Fetch remote resource as a stream using axios
  axios.get(req.params.url, {
    responseType: 'stream', // Ensure the response is streamed
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
      "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
      via: "1.1 bandwidth-hero"
    },
    maxRedirects: 4 // Similar to undici's maxRedirections option
  })
  .then(response => {
    // Handle non-success status codes
    if (response.status >= 400) {
      return redirect(req, res);
    }

    // Handle redirects
    if (response.status >= 300 && response.headers.location) {
      return redirect(req, res);
    }

    responseStream = response.data; // Stream the response data
    copyHeaders(response, res);

    // Set required headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('content-encoding', 'identity');

    req.params.originType = response.headers['content-type'] || '';
    req.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

    // Handle stream errors
    responseStream.on('error', () => req.socket.destroy());

    // Check if the response should be compressed
    if (shouldCompress(req)) {
      // Compress the response stream
      compress(req, res, response);
    } else {
      // Bypass compression and pipe the original stream directly to the client
      res.setHeader("x-proxy-bypass", 1);

      // Forward necessary headers
      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in response.headers) {
          res.setHeader(headerName, response.headers[headerName]);
        }
      }

      // Pipe the original response stream to the client
      responseStream.pipe(res);
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
    req.socket.destroy();
  });
}

module.exports = proxy;
