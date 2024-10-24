"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const axiosRequest = require('axios').get;
const pick = require('lodash').pick;
const shouldCompress = require("./shouldCompress");
const redirect = require('./redirect');
const compress = require('./compress1');
const copyHeaders = require('./copyHeaders');

async function proxy(req, res) {
  try {
    let origin = await axiosRequest(req.params.url, {
      responseType: 'stream', // Ensure the response is streamed
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 bandwidth-hero"
      },
      decompress: true,
      maxRedirects: 5 // Similar to undici's maxRedirections option
    });

    // Redirect or error for non-success status codes
    if (origin.status >= 400) {
      return redirect(req, res);
    }

    // Handle redirects explicitly
    if (origin.status >= 300 && origin.headers.location) {
      return redirect(req, res);
    }

    // Axios streams the response in `data`
    copyHeaders(origin, res);

    // Set the necessary headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('content-encoding', 'identity');

    req.params.originType = origin.headers['content-type'] || '';
    req.params.originSize = origin.headers['content-length'], 10 || 0;

    // Handle errors on the response body stream
    origin.data.on('error', _ => req.socket.destroy());

    if (shouldCompress(req)) {
      /*
       * sharp supports stream. So pipe it.
       */
       compress(req, res, origin);
    } else {
      /*
       * Downloading then uploading the buffer to the client is not a good idea,
       * It would be better if you pipe the incoming buffer to the client directly.
       */
      res.setHeader("x-proxy-bypass", 1);

      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in origin.headers)
          res.setHeader(headerName, origin.headers[headerName]);
      }

      return origin.data.pipe(res);
    }

  } catch (err) {
    // Handle invalid URL error
    if (err.code === "ERR_INVALID_URL") {
      return res.status(400).send("Invalid URL");
    }

    /*
     * When there's a real error, Redirect then destroy the socket immediately.
     */
    redirect(req, res);
    console.error(err);

    // Destroy the request socket on error to prevent hanging
    
  }
}

module.exports = proxy;
