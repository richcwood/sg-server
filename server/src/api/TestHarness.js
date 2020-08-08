const express = require("express");
const path = require("path");
const theAPI = require("./API");

const app = express();
new theAPI.default(app);

const port = 8080;
app.listen(port);
console.log('Test API running on port ' + port);