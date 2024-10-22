"use strict";

function bypass(request, reply, stream) {
    const contentLength = request.params.originSize || 0; // Fallback to 0 if not provided
    reply.header('x-proxy-bypass', 1);
    if (contentLength > 0) {
        reply.header('content-length', contentLength);
    }
    return reply.send(stream);
}
module.exports= bypass;
