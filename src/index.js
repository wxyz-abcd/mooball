const initAPI = require("./api.js");
const indexCommon = require("./indexCommon.js");

module.exports = (window, config)=>indexCommon(initAPI, window, config);