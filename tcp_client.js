var net = require('net');
var logger = require('winston');
var formatters = require('./formatters');

function Client (options) {
	if (!(options && options.host)) {
		throw new Error('No host defined');
	}
	if(options.host==='api.logmatic.io' && !options.apiKey){
		throw new Error('No Logmatic.io API Key defined');
	}
	if (!(options && options.port)) {
		throw new Error('No port defined');
	}

	this._host = options.host;
	this._port = options.port;
	this._apiKey = options.apiKey;
	this._meta = options.meta;

	if(!options.formatter){
		this._formatter = formatters.Default;
	}else
		this._formatter = options.formatter;
}

Client.prototype.connect = function (callback) {
	if (this._client) {
		throw Error('Cannot connect twice');
	}
	var self = this;
	this._client = net.connect({ host: this._host, port: this._port, writable: true }, function () {
		logger.info('Client connected to ',self._host,self._port);
		callback();
	});
};

Client.prototype.write = function (data) {
	if (!this._client) {
		throw new Error('Client not connected');
	}
	var formatted_data = this._formatter({apiKey:this._apiKey,meta: this._meta,data:data});

	logger.debug("Client write: ",formatted_data);
	this._client.write(formatted_data);
};

Client.prototype.end = function () {
	if (this._client) {
		logger.info('Client ended');
		this._client.end();
		this._client = null;
	}
};

module.exports = Client;
