const express = require('express')
const proxy = require('./src/proxy4')
const params = require('./src/params')
const app = express()
app.enable('trust proxy');
app.get('/', params, proxy);


app.get('/favicon.ico', (req, res) => res.status(204).end());

module.exports = app;
