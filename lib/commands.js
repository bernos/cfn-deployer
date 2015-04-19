var path 		= require('path'),
	glob   		= require('glob'),
	AWS    		= require('aws-sdk'),
	fs     		= require('fs'),
	_      		= require('lodash'),
	l      		= require('./logger.js'),
	EventLogger = require('./stack-event-logger.js');	

module.exports = {
	create : function(config, cb) {
		uploadTemplates(config.TemplateFolder, config.Bucket, config.Version, wrap(cb, function(result) {
		 	var templateUrls = _.map(result, function(i) { return i.Location; });

		 	findMasterTemplateUrl(config.MainTemplate, templateUrls, function(err, master) {
		 		err ? cb(err) : createStack(master, config, cb);
		 	});
		}, "Upload failed with the following errors "));
	},

	update: function(config) {}
}

function wrap(cb, fn, msg) {
	// TODO: allow more than one result
	return function(err, result) {
		err ? cb([msg, err]) : fn(result, cb);
	}
}


function createStack(masterTemplateUrl, config, cb) {

	var params = buildCreateTemplateParameters(masterTemplateUrl, config),			 	
 		cf = new AWS.CloudFormation();

 	cf.createStack(params, wrap(cb, function(data) {
 		waitForStack(cf, config.StackName, 'CREATE_COMPLETE', cb);
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




function buildCreateTemplateParameters(masterTemplateUrl, config) {

	var templateParameters = config.Params || {};
		templateParameters.Version = config.Version;
		templateParameters.TemplateBaseUrl = masterTemplateUrl.substring(0, masterTemplateUrl.lastIndexOf("/"));
	
	// TODO: Add Capabilities
	
	return {
		StackName   : config.StackName,
		Parameters  : _.map(templateParameters, kvToStackParameter),
		Tags        : _.map(config.Tags || {}, kvToStackTag),
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

function uploadTemplates (templateFolder, bucket, version, cb) {
	buildTemplateUploadList(templateFolder, version, wrap(cb, function(uploadList) {	
		var result = [],
			s3     = new AWS.S3(),
			errors = [];


// TODO: handle empty upload list
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


function buildTemplateUploadList(templateFolder, version, cb) {
	var pattern = path.join(templateFolder, "*.*"),
		list    = [];

	glob(pattern, wrap(cb, function(files) {
		_.each(files, function(file) {
			list.push({
				src  : file,
				dest : version + file.substring(templateFolder.length)
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