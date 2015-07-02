var config = {};

config.s3 = {};

config.s3.bucket = process.env.S3_BUCKET || '';
config.s3.prefix = process.env.S3_PREFIX || '';
config.s3.fromKey = process.env.S3_FROM_KEY || '';

config.polling_period_ms = process.env.POLLING_PERIOD_MS || -1;
config.state_file = process.env.STATE_FILE || './state.json';
config.from = process.env.FROM || null;

config.tcp = {};
config.tcp.host = process.env.TCP_HOST || 'api.logmatic.io';
config.tcp.port = process.env.TCP_PORT || '10514';
config.tcp.formatter =  process.env.TCP_FORMATTER || 'Logmatic';
config.tcp.meta = {};

config.logmatic = {};
config.logmatic.apiKey = process.env.LOGMATIC_API_KEY;

config.logger = {};
config.logger.level = process.env.LOG_LEVEL || 'info';

module.exports = config;
