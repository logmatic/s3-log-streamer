var Client = require('./tcp_client');
var S3Poller = require('./S3Poller');
var moment = require('moment');
var logger = require('winston');
var config = require('./config');
var fs = require('fs');

//Configure logger
logger.level = config.logger.level;

logger.info("Start",config.logmatic.apiKey);

//Configure Logmatic.io's client
var client = new Client({
  host: config.tcp.host,
  port: config.tcp.port,
  apiKey:config.logmatic.apiKey,
  meta: config.tcp.meta,
  formatter: require('./formatters')[config.tcp.formatter]
});

//Configure s3_params
var s3_params = {Bucket: config.s3.bucket, Prefix: config.s3.prefix};
if(config.s3.fromKey){
  s3_params.Marker = config.s3.fromKey;
}
var s3Poller = new S3Poller({"s3_params":s3_params});

//Poller & client wiring
var pollingCycle = function(){
  //Connect client
  client.connect(function(){
    s3Poller.poll();
  });
};
s3Poller.on('data',function(data){
  client.write(data);
});

//Polling Cycles event emitter
var events = require('events');
var polling_cycles = new events.EventEmitter();
polling_cycles.on('start',function(state){
  if(state)
  s3Poller._last = state;//Connect client
  pollingCycle();
});
polling_cycles.on('end',function(state){
  if(config.polling_period_ms>0){
    logger.info("-----------Next cycle starting in "+config.polling_period_ms+" ms.");
    setTimeout(function () {
      polling_cycles.emit('start',state);
    }, config.polling_period_ms)
  }
});

s3Poller.on('end',function(){
  client.end();
  fs.writeFile(config.state_file,JSON.stringify(s3Poller._last),function(){
    logger.info("Persisted state file",s3Poller._last);
    polling_cycles.emit('end',s3Poller._last);
  });
});

//Retrieve state file content and start
fs.readFile(config.state_file, 'utf8', function (err,data) {
  if (err) {
    polling_cycles.emit('start',null);
    return;
  }
  var lastState = JSON.parse(data);
  logger.info("Loaded state file",JSON.stringify(lastState));
  polling_cycles.emit('start',lastState)
});
