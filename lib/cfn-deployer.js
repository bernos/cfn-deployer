/**
 * cfn-deployer create|update -stackname -region -template -child-templates -version -bucket -params -tags
 *
 * Enumerate files in templatedir
 * If no version supplied, generate random version label
 * Upload all files in templatedir to bucket using versionlabel in key
 * Call cfn create or update command, passing tags and params, plus the following extra 
 *	params
 *
 *		StackVersion
 *		TemplateBaseUrl
 */

var nomnom 		= require('nomnom'),
	glob   		= require('glob'),
	path   		= require('path'),
	AWS    		= require('aws-sdk'),
	fs     		= require('fs'),
	_      		= require('lodash'),
	l      		= require('./logger.js'),
	EventLogger = require('./stack-event-logger.js'),
	CliParser 	= require('./cli-parser.js');

CliParser.parse(nomnom, main);

function main(command, options) {
	
	AWS.config.update({
		region : options.region
	});

	if (options['aws-access-key-id'] && options['aws-secret-access-key']) {
		AWS.config.update({
			accessKeyId 	: options['aws-access-key-id'],
			secretAccessKey : options['aws-secret-access-key'] 
		});
	}

	function commandCallback(command) {
		return function(err, result) {
			if (err) {
				if (err.constructor !== Array) {
					err = [err];
				}

				err.unshift("Error: ");

				l.error.apply(l, err);
			} else {
				l.success("Command '%s' comleted successfully", command);
			}
		}
	}

	switch(command) {
		case "create" :
			create(options, commandCallback("create"));
			break;
		case "update" :
			update(options, commandCallback("update"));
			break;
	}
}

function wrap(cb, fn, msg) {
	// TODO: allow more than one result
	return function(err, result) {
		err ? cb([msg, err]) : fn(result, cb);
	}
}


function create(options, cb) {

	uploadTemplates(process.cwd(), options['template-folder'], options.bucket, options.version, wrap(cb, function(result) {
	 	var templateUrls = _.map(result, function(i) { return i.Location; });

	 	findMasterTemplateUrl(options['main-template'], templateUrls, function(err, master) {
	 		err ? cb(err) : createStack(master, options, cb);
	 	});
	}, "Upload failed with the following errors "));

/*
	uploadTemplates(process.cwd(), options['template-folder'], options.bucket, options.version, function(err, result) {
		
		 if (err) {
		 	cb(["Upload failed with the following errors ", err]);
		 } else {

		 	var templateUrls = _.map(result, function(i) { return i.Location; });

		 	findMasterTemplateUrl(options['main-template'], templateUrls, function(err, master) {
		 		err ? cb(err) : createStack(master, options, cb);
		 	});
		}
	});*/
}

function createStack(masterTemplateUrl, options, cb) {
	
	var params = buildCreateTemplateParameters(masterTemplateUrl, options),			 	
 		cf = new AWS.CloudFormation();

 	cf.createStack(params, wrap(cb, function(data) {
 		waitForStack(cf, options['stack-name'], 'CREATE_COMPLETE', cb);
 	}, "Failed to create stack"));


 	/*
 	cf.createStack(params, function(err, data) {
 		err ? cb(["Failed to create stack", err]) : waitForStack(cf, options['stack-name'], 'CREATE_COMPLETE', cb);
 	});*/ 	
}

function findMasterTemplateUrl(masterTemplate, urls, cb) {
	var master = _.find(urls, function(url) {
 		return url.split("/").pop() == masterTemplate;
 	});

 	cb(master ? null : "could not find master template url", master);
}


function update(options) {}

function buildCreateTemplateParameters(masterTemplateUrl, options) {

	var templateParameters = options.params || {};
		templateParameters.Version = options.version;
		templateParameters.TemplateBaseUrl = masterTemplateUrl.substring(0, masterTemplateUrl.lastIndexOf("/"));
	
	// TODO: Add Capabilities
	
	return {
		StackName   : options['stack-name'],
		Parameters  : _.map(templateParameters, kvToStackParameter),
		Tags        : _.map(options.tags || {}, kvToStackTag),
		TemplateURL : masterTemplateUrl
	};
}

function kvToStackParameter(value, key) {
	return {
		ParameterKey   : key,
		ParameterValue : value
	};
}

function kvToStackTag(value, key) {
	return {
		Key   : key,
		Value : value
	};
}

function uploadTemplates (baseDir, templateFolder, bucket, version, cb) {
	buildTemplateUploadList(baseDir, templateFolder, version, wrap(cb, function(uploadList) {	
		var result = [],
			s3     = new AWS.S3(),
			errors = [];

		_.each(uploadList, function(item) {
			var stream = fs.createReadStream(item.src),
				key    = item.dest;
			
			upload(s3, bucket, key, stream, function(err, data) {
				err ? errors.push(err) : result.push(data);

				if (result.length == uploadList.length) {
					cb(errors.length ? errors : false, result);
				}
			});
		});		
	}));

	/*
	buildTemplateUploadList(baseDir, templateFolder, version, function(err, uploadList) {
		if (err) {
			cb(err);
		} else {
			var result = [],
				s3     = new AWS.S3(),
				errors = [];

			_.each(uploadList, function(item) {
				var stream = fs.createReadStream(item.src),
					key    = item.dest;
				
				upload(s3, bucket, key, stream, function(err, data) {
					err ? errors.push(err) : result.push(data);

					if (result.length == uploadList.length) {
						cb(errors.length ? errors : false, result);
					}
				});
			});
		}
	});*/
}

function upload(s3, bucket, key, stream, cb) {
    s3.upload({
        Bucket  : bucket,
        Key     : key,
        Body    : stream
    })
    .on('httpUploadProgress', function(e) {
        l.info("Uploading %s Part %d - %d of %d.", key, e.part, e.loaded, e.total);
    })
    .send(cb);
}


function buildTemplateUploadList(baseDir, templateFolder, version, cb) {
	var pattern = path.join(baseDir, templateFolder, "*.*"),
		list    = [];

	glob(pattern, wrap(cb, function(files) {
		_.each(files, function(file) {
			list.push({
				src  : file,
				dest : version + file.substring(baseDir.length + templateFolder.length + 1)
			})
		});

		cb(false, list);
	}));

/*
	glob(pattern, function(err, files) {

		if (err) {
			throw err;
		}

		_.each(files, function(file) {
			list.push({
				src  : file,
				dest : version + file.substring(baseDir.length + templateFolder.length + 1)
			})
		});

		cb(false, list);
	});*/
}


function waitForStack(cf, stackName, status, cb) {

    l.info("Waiting for stack %s to reach status %s.", stackName, status);

    var eventLogger = new EventLogger(cf, stackName, l.info, 2500);

    function checkStatus(stackName, status, cb) {
        cf.describeStacks ({
            StackName : stackName
        }, function(err, data) {
            if (err) {
            	eventLogger.stop();
                cb(err);
            } else {
                var stack = _.find(data.Stacks , { StackName  : stackName });

                if (!stack) {
            	    eventLogger.stop();
            		cb("could not locate stack");
                } else if (stack.StackStatus  == status) {
            		eventLogger.stop();
                    cb(false)
                } else {
                    _.delay(checkStatus, 10000, stackName, status, cb);
                }
            }
        })
    }

    eventLogger.start();
    checkStatus(stackName, status, cb);

}