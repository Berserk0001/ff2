#!/usr/bin/env node
'use strict'
const cluster = require("cluster");


if (cluster.isPrimary) {
  const numClusters = process.env.CLUSTERS || 8;

  console.log(`Primary ${process.pid} is running. Will fork ${numClusters} clusters.`);

  // Fork workers.
  for (let i = 0; i < numClusters; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking another one....`);
    cluster.fork();
  });

  return true;
}


const express = require('express')
const proxy = require('./src/proxy')
const params = require('./src/params')
const app = express()
const PORT = process.env.PORT || 8080;
app.enable('trust proxy');
app.get('/', params, proxy);


app.get('/favicon.ico', (req, res) => res.status(204).end());

//app.listen(PORT, () => console.log(`Listening on ${PORT}`));
app.listen(PORT, () => console.log(`Worker ${process.pid}: Listening on ${PORT}`))
