const express = require('express')
const proxy = require('./src/proxy2')
const params = require('./src/params')
const app = express()

app.get('/', params, proxy);


 app.listen(8080, () => {
      console.log('Server running on port 8080');
      });
