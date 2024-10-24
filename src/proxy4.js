"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const undiciRequest = require('undici').request;
const pick = require('lodash').pick;
const shouldCompress = require('./shouldCompress');
const redirect = require('./redirect');
const compress = require('./compress3');
const copyHeaders = require('./copyHeaders');

function proxy(req, res) {

  undiciRequest(req.params.url, {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
      "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
      via: "1.1 bandwidth-hero",
    },
    maxRedirections: 4
  })
    .then(origin => {
      // Redirect or error for non-success status codes
      if (origin.statusCode >= 400 || (origin.statusCode >= 300 && origin.headers.location)) {
        return redirect(req, res);
      }

      copyHeaders(origin, res);

      // Set the necessary headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
      res.setHeader('content-encoding', 'identity');

      req.params.originType = origin.headers['content-type'] || '';
      req.params.originSize = origin.headers['content-length'], 10 || 0;

      // Handle errors on the response body stream
      origin.body.on('error', _ => req.socket.destroy());

      if (shouldCompress(req)) {
         compress(req, res, origin);
      } else {
        res.setHeader("x-proxy-bypass", 1);

        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in origin.headers)
            res.setHeader(headerName, origin.headers[headerName]);
        }

        return origin.body.pipe(res);
      }
    })
    .catch(err => {
      if (err.code === "ERR_INVALID_URL") {
        return res.status(400).send("Invalid URL");
      }

      // When there's an error, redirect and destroy the socket immediately.
      redirect(req, res);
      console.error(err);
    });
}

module.exports = proxy;
