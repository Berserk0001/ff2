const express = require('express')
const proxy = require('./src//proxy1')
const params = require('./src/params')
const PORT = process.env.PORT || 8080
const app = express()

app.get('/', params, proxy);


app.listen(PORT, () => console.log(`Worker ${process.pid}: Listening on ${PORT}`))
