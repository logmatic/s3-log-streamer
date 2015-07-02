#s3-log-streamer

S3 Log Streamer aims at facilitating the extraction of real time s3 log published and stream it to tcp clients, syslog clients or a [Logmatic.io](http://logmatic.io) platform. This project is able to stream logs from S3 accesses, AWS Cloudtrail, and most AWS third party services.

## Log directories conditions

This library polls all the logs from a bucket and an S3 directory. However, some conditions must be fullfiled:

* Only logs must resides in the pointed log directory
* Log files must be ordered alphabetically according to their creation time (all AWS services do that)

## AWS credentials

Before starting, you need to get valid [AWS security credentials](http://docs.aws.amazon.com/general/latest/gr/aws-security-credentials.html) and ensure to place or declare them on your operating system.

For instance, you can follow the [Configuring the AWS Command Line Interface](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) provided by AWS.

On Mac and UNIX system, simply copy under `~/.aws/credentials` the provided `aws_access_key_id` and `aws_secret_access_key` as illustrated here:

```
[default]
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Streaming s3 log data
Once your credentials are setup you can start streaming log data from a S3 bucket

### To Logmatic.io

#### Single polling cycle

To stream S3 logs you need to define:

- A bucket: `S3_BUCKET`
- A directory: `S3_PREFIX`
- A Logmatic.io's API key: `LOGMATIC_API_KEY`

So to launch a single polling cycle you can enter the following command line:

```
S3_BUCKET=<your_bucket> S3_PREFIX=<your_directory> LOGMATIC_API_KEY=<your_api_key> node index.js
```

That will load all the log data from the last hour, stream it to Logmatic.io and persist a state file under `./state.json`. The state file is used so on the next polling cycle the project will start from the last S3 object at the right position in the file.

You can add `LOG_LEVEL=debug` to your command line if you want to get the detail of all the operations done.

#### Periodic polling cycles

You can ask the libary to poll periodically by defining a time cycle in millisec. For instance, if you want to push S3 data every 15 seconds:

```
S3_BUCKET=<your_bucket> S3_PREFIX=<your_directory> LOGMATIC_API_KEY=<your_api_key> POLLING_PERIOD_MS=15000 node index.js
```

#### Use the syslog RFC-5424 format

Some Logmatic.io users already provide their server logs through syslog forwarders respecting the RFC-5424 format.
If you want to maintain this log format, the libary can also do it. Add the following configuration:

```
... TCP_FORMATTER=Logmatic_RFC5424 node index.js
```

### To a syslog server

This library is generic enough to send AWS S3 logs to any syslog server (Rsyslog, Syslog-NG, NXLog etc...). Feel free to use it for your own usage.

To do this you need to have a running syslog server listening a under a defined TCP port.
Use the command line below to launch such polling cycle periodically and forward it to your server:

```
S3_BUCKET=<your_bucket> S3_PREFIX=<your_directory> TCP_HOST=<your_syslog_host> TCP_HOST=<your_syslog_port> POLLING_PERIOD_MS=15000 node index.js
``` 

### I have multiple log directories I want to follow. How do I do?

Yes the S3 log streamer has been build to follow logical log files of a single directory and then potentially of a single service.

However, you can launch how many log streamers in parallel simply by changing the name of their state file:

```
... STATE_FILE=<state_file1> node index.js
... STATE_FILE=<state_file2> node index.js
etc...
```

### The first time I start I need to recover some log history?

You can provide a `from` date condition in your command line. It will be used the first time then the state file take the relay.

```
... FROM=<valid js date> node index.js
```