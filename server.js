const express = require('express')
const proxy = require('./src//proxy')
const params = require('./src/params')
const app = express()

app.get('/', params, proxy);

app.listen(3000, () => {
  console.log('Server running on port 3000')
});
