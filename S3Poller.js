var AWS = require('aws-sdk');
var moment = require('moment');
var Lazy=require('lazy');
var logger = require('winston');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function S3Poller (options) {
  EventEmitter.call(this);
  // Store s3_params
  if (!(options.s3Params && options.s3Params.Bucket && options.s3Params.Prefix)) {
    throw Error('s3Params not properly defined. Bucket & Prefix are mandatory.');
  }
  this._s3Params = options.s3Params;

  if (options.from) {
    this._from = moment(options.from);
  } else {
    this._from = moment().subtract(1, 'hours');
  }
}
util.inherits(S3Poller, EventEmitter);

S3Poller.prototype.poll = function (state) {
  if (state) {
    this._last = state;
  }
  var s3 = new AWS.S3();
  var self = this;

  // List of S3 files to read
  var filesBuffer = [];
  var lastFile = null; // We keep track of the last file

  var interruptPagination = false;

  var readNextFile = function () {
    var nextFile = filesBuffer.shift();
    logger.debug('S3Poller.readNextFile filesBuffer size', filesBuffer.length, 'nextFile', !nextFile || (nextFile.Key +' Size ' + nextFile.Size));
    if (nextFile == null) { // Need to lookup the next files
      if (interruptPagination) {
        self.emit('end', self._last);
        return;
      }

      var listParams = {
        Bucket: self._s3Params.Bucket,
        Prefix: self._s3Params.Prefix,
      };
      if (self._last.Key) {
        listParams.Marker = self._last.Key.substring(0,self._last.Key.length-1);
      } else if (self._s3Params.Marker) {
        listParams.Marker = self._s3Params.Marker;
      }

      //List objects
      logger.info('### S3 listParams', listParams);
      s3.listObjects(listParams, function (err, data) {
        if (err) {
          self.emit('error', err, self._last);
        } else {
          //End of pagination
          if (!data.Contents || data.Contents.length === 0){
            self.emit('end', self._last);
          } else {
            if (data.Contents.length < data.MaxKeys) {
              interruptPagination = true;
            }
            filesBuffer = filesBuffer.concat(data.Contents);
            logger.info('filesBuffer size', filesBuffer.length);
            readNextFile();
          }
        }
      });
    } else {
      handleS3Content(nextFile, readNextFile);
    }
  };

  var handleS3Content = function (content, callback) {
    // Create s3 params for getObject method
    var objectParams = {
      Bucket: self._s3Params.Bucket,Key:
      content.Key
    };

    // Handle last cursors
    if (  self._last &&
          self._last.Key === content.Key) {
        if (self._last.Size > content.Size) {
          objectParams.Range = 'bytes=' + self.last.size + '-';
        } else {
          // Do not read the file if not bigger...
          logger.debug('File ', content.Key , ' did not changed since last polling cycle...');
          callback();
          return;
        }
      }

      // Keep last file state
      self._last.Key = content.Key;
      self._last.Size = content.Size;

      // Check "from" condition
      var lastModified = moment(content.LastModified);
      if (self._from > lastModified) {
        logger.debug('File', content.Key, ' not recent enough and under the `from` limit', self._from.toString());
        callback();
        return;
      }

      // Call AWS
      logger.debug('### S3 getObject', objectParams);
      var rstream = s3.getObject(objectParams).createReadStream();
      rstream.on('error', function (err) {
        logger.error('Error while calling getObject on AWS S3', err);
        callback();
      });
      rstream.on('end', function () {
        logger.debug('END object', content.Key);
        callback();
      });

      // Emit lines
      new Lazy(rstream).lines.forEach(function (line) {
        // Build json object
        var jsonObject = {
          s3bucket: self._s3Params.Bucket,
          s3key: this.Key,
          message: line.toString()
        };

        // Emit the event
        self.emit('data',jsonObject);
      }.bind({
        Key: content.Key
      }));
    };

    // Start
    self.emit('start');
    readNextFile();
  };

  module.exports = S3Poller;
