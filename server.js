#!/usr/bin/env node
'use strict';


const fastify = require('fastify')({trustProxy: true});
const proxy = require('./src/proxy5.js'); // Import the default export

const PORT = process.env.PORT || 8080;

// Set up the route
fastify.get('/', proxy);

// Start the server

  try {
    fastify.listen({ host: '0.0.0.0', port: PORT });
    console.log(`Listening on ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
