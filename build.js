const { zipFunctions } = require("@netlify/zip-it-and-ship-it")
const fsPromises = require('fs').promises

fsPromises.mkdir('dist').catch().then(() => {
  zipFunctions("src", "dist")
})
