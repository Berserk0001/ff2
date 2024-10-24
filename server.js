#!/usr/bin/env node
'use strict'
const express = require('express')
const proxy = require('./src/proxy4')
const params = require('./src/params')
const app = express()
app.use(compression());
const PORT = process.env.PORT || 8080;
app.enable('trust proxy');
app.get('/', params, proxy);


app.get('/favicon.ico', (req, res) => res.status(204).end());

//app.listen(PORT, () => console.log(`Listening on ${PORT}`));
app.listen(PORT, () => console.log(`Worker ${process.pid}: Listening on ${PORT}`))
