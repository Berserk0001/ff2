"use strict";
const undici = require("undici");
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const bypass = require("./bypass");
const redirect = require("./redirect");
const compress = require("./compress");
const copyHeaders = require("./copyHeaders");

async function proxy(req, res) {
  let url = req.query.url;
  if (Array.isArray(url)) url = url.join('&url=');
  if (!url) {
    return res.send('bandwidth-hero-proxy');
  }
  url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://');
  req.params.url = url;
  req.params.webp = !req.query.jpeg;
  req.params.grayscale = req.query.bw != 0;
  req.params.quality = parseInt(req.query.l, 10) || 40;

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
    res.setHeader('content-encoding', 'identity');
    req.params.originType = response.headers['content-type'] || '';
    req.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

    responseStream.on('error', (err) => {
      console.error('Stream error:', err);
      redirect(req, res);
      responseStream.destroy();
    });

    if (shouldCompress(req)) {
      await compress(req, res, responseStream);
    } else {
      await bypass(req, res, responseStream);
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
