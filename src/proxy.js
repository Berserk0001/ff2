"use strict";
const undici = require("undici");
const pick = require("lodash").pick;
const shouldCompress = require("./shouldCompress");
const bypass = require("./bypass");
const redirect = require("./redirect");
const compress = require("./compress8");
const copyHeaders = require("./copyHeaders");

async function proxy(request, reply) {
  let url = request.query.url;
  if (Array.isArray(url)) url = url.join('&url=');
  if (!url) {
    return reply.send('bandwidth-hero-proxy');
  }
  url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'http://');
  request.params.url = url;
  request.params.webp = !request.query.jpeg;
  request.params.grayscale = request.query.bw != 0;
  request.params.quality = parseInt(request.query.l, 10) || 40;

  let responseStream;
  await undici.request(request.params.url, {
    headers: {
      ...pick(request.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
      "x-forwarded-for": request.headers["x-forwarded-for"] || request.ip,
      via: "1.1 bandwidth-hero",
    },
    maxRedirections: 4
  })
  .then(response => {
    if (response.statusCode !== 200) {
      throw new Error(`Unexpected response status: ${response.statusCode}`);
    }
    responseStream = response.body;
    copyHeaders(response, reply);
    reply.header('content-encoding', 'identity');
    request.params.originType = response.headers['content-type'] || '';
    request.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

    responseStream.on('error', (err) => {
      console.error('Stream error:', err);
      redirect(request, reply);
      responseStream.destroy();
    });

    if (shouldCompress(request)) {
      return compress(request, reply, responseStream);
    } else {
      return bypass(request, reply, responseStream);
    }
  })
  .catch(err => {
    console.error('Proxy error:', err.message || err);
    redirect(request, reply);
    if (responseStream) {
      responseStream.destroy();
    }
  });
}

module.exports = proxy;
