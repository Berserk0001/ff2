"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
const undici = require("undici");
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress1");
const copyHeaders = require("./copyHeaders");

function proxy(req, res) {
  let responseStream;

  undici.request(req.params.url, {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
      "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
      via: "1.1 bandwidth-hero",
    },
    maxRedirections: 4
  })
    .then(response => {
      // Redirect or error for non-success status codes
      if (response.statusCode >= 400 || (response.statusCode >= 300 && response.headers.location)) {
        return redirect(req, res);
      }

      responseStream = response.body;
      copyHeaders(response, res);

      // Set the necessary headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
      res.setHeader('content-encoding', 'identity');

      req.params.originType = response.headers['content-type'] || '';
      req.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

      // Handle errors on the response body stream
      responseStream.on('error', _ => req.socket.destroy());

      if (shouldCompress(req)) {
         compress(req, res, response);
      } else {
        res.setHeader("x-proxy-bypass", 1);

        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in response.headers)
            res.setHeader(headerName, response.headers[headerName]);
        }

        return responseStream.pipe(res);
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
