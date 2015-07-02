var SyslogProducer = require('glossy').Produce;
var moment = require('moment');

var  logmaticSyslogProducer = new SyslogProducer({});
var logmatic_RFC5424_formatter = function(options){
  //Workaround to the Glossy Timezone bug....
  var d = new Date();
  d.setHours(d.getHours()-d.getTimezoneOffset()/60 );
  var line = options.apiKey + " " + logmaticSyslogProducer.produce({
      facility: options.meta.facility || 'local4', // these can either be a valid integer,
      severity: options.meta.level ||'info',  // or a relevant string
      host: options.meta.host ||'AWS',
      appName: options.meta.appName || 'S3_access',
      pid: options.meta.pid || '',
      date: d,
      message: JSON.stringify(options.data)
  });
  return line+"\n";
};

var syslogProducer = new SyslogProducer({type:"RFC3164"});
var syslog_formatter = function(options){
  //Workaround to the Glossy Timezone bug....
  var d = new Date();
  d.setHours(d.getHours()-d.getTimezoneOffset()/60 );
  var line = syslogProducer.produce({
      facility: options.meta.facility || 'local4', // these can either be a valid integer,
      severity: options.meta.level ||'info',  // or a relevant string
      host: options.meta.host ||'AWS',
      appName: options.meta.appName || 'S3_access',
      pid: options.meta.pid || '',
      date: d,
      message: JSON.stringify(options.data)
  });
  return line+"\n";
};

var logmatic = function(options){
    return [ options.apiKey, ' ', JSON.stringify(options.data), '\n' ].join('')
};


module.exports = {
  "Syslog": syslog_formatter,
  "Logmatic_RFC5424": logmatic_RFC5424_formatter,
  "Logmatic": logmatic,
  "Default": logmatic
};
