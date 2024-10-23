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
const compress = require("./compress");
const copyHeaders = require("./copyHeaders");

async function proxy(req, res) {

  let responseStream;
  try {
    const response = await undici.request(req.params.url, {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 bandwidth-hero",
      },
      maxRedirections: 4
    });

    if (response.statusCode !== 200) {
      throw new Error(`Unexpected response status: ${response.statusCode}`);
    }

    responseStream = response.body;
    copyHeaders(response, res);
    res.setHeader("content-encoding", "identity");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    req.params.originType = response.headers['content-type'] || '';
    req.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

    responseStream.on('error', (err) => {
      console.error('Stream error:', err);
      redirect(req, res);
      responseStream.destroy();
    });

    if (shouldCompress(req)) {
      /*
     * sharp support stream. So pipe it.
     */
      await compress(req, res, responseStream);
    } else {
      /*
     * Downloading then uploading the buffer to the client is not a good idea though,
     * It would better if you pipe the incomming buffer to client directly.
     */

    res.setHeader("x-proxy-bypass", 1);

    for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
      if (headerName in origin.headers)
        res.setHeader(headerName, origin.headers[headerName]);
    }

    return origin.body.pipe(res);
    }

  } catch (err) {
    console.error('Proxy error:', err.message || err);
    redirect(req, res);
    if (responseStream) {
      responseStream.destroy();
    }
  }
}

module.exports = proxy;
