
/* global require, exports */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({maxInstances: 10});

exports.helloWorld = onRequest((request, response) => {
  logger.info("Creative Deadline Functions is running");
  response.status(200).send("Creative Deadline API is running!");
});
