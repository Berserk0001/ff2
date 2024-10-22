"use strict";

function redirect(request, reply) {
  if (reply.sent) return; // Check if headers have already been sent

  reply
    .header('content-length', '0')
    .removeHeader('cache-control')
    .removeHeader('expires')
    .removeHeader('date')
    .removeHeader('etag')
    .header('location', encodeURI(request.params.url))
    .code(302)
    .send(); // Use send to complete the response
}

module.exports = redirect;
