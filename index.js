var Client = require('./tcp_client');
var S3Poller = require('./S3Poller');
var moment = require('moment');
var logger = require('winston');
var config = require('./config');
var fs = require('fs');
var formatters = require('./formatters');
var events = require('events');

// Configure logger
logger.level = config.logger.level;

logger.info('Start', config.logmatic.apiKey);

// Configure Logmatic.io's client
var client = new Client({
  host: config.tcp.host,
  port: config.tcp.port,
  apiKey: config.logmatic.apiKey,
  meta: config.tcp.meta,
  formatter: formatters[config.tcp.formatter]
});

// Configure s3Params
var s3Params = {
  Bucket: config.s3.bucket,
  Prefix: config.s3.prefix
};
if (config.s3.fromKey) {
  s3Params.Marker = config.s3.fromKey;
}
var s3Poller = new S3Poller({
  s3Params: s3Params
});

// Poller & client wiring
s3Poller.on('error', function (err, state) {
  logger.error(err, err.stack); // an error occurred
  // End the client
  client.end();
  // Write the last state
  fs.writeFile(config.state_file, JSON.stringify(state), function () {
    logger.info('Persisted state file', state);

    // Exit the process
    process.exit(1);
  });
});

s3Poller.on('data',function (data) {
  client.write(data);
});

s3Poller.on('end', function (state) {
  client.end();
  fs.writeFile(config.state_file, JSON.stringify(state), function () {
    logger.info('Persisted state file', state);

    // Now we are ready for the next polling cycle
    if (config.polling_period_ms > 0) {
      logger.info('-----------Next cycle starting in ' + config.polling_period_ms + ' ms.');
      setTimeout(function () {
        pollingCycle(state);
      }, config.polling_period_ms);
    }
  });
});

var pollingCycle = function(state){
  //Connect client
  client.connect(function(){
    s3Poller.poll(state);
  });
};

// Retrieve state file content and start
fs.readFile(config.state_file, 'utf8', function (err, data) {
  if (err) {
    pollingCycle(null);
    return;
  }
  var lastState = JSON.parse(data);
  logger.info('Loaded state file',JSON.stringify(lastState));
  pollingCycle(lastState);
});
