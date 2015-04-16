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

var parser = require('nomnom'),
	glob   = require('glob'),
	path   = require('path'),
	guid   = require('guid'),
	AWS    = require('aws-sdk'),
	fs     = require('fs'),
	_      = require('lodash'),
	l      = require('./logger.js'),
	EventLogger = require('./stack-event-logger.js');

parseCliCommands(parser);

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

	switch(command) {
		case "create" :
			create(options);
			break;
		case "update" :
			update(options);
			break;
	}
}

function create(options) {
	uploadTemplates(process.cwd(), options['template-folder'], options.bucket, options.version, function(err, result) {
		
		 if (err) {
		 	var errors = _.map(result, function(item) {
		 		return item.error;
		 	});
		 	l.error("Upload failed with the following errors ", errors)
		 } else {
		 	// Find master template S3 location from result

		 	var master = _.find(result, function(i) {
		 		var tokens = i.data.Location.split("/");

		 		return tokens[tokens.length - 1] == options['main-template'];
		 	});

		 	if (master) {
		 		// Call cfn create
		 		var masterTemplateUrl  = master.data.Location,
		 			params = buildCreateTemplateParamers(masterTemplateUrl, options),			 	
			 		cf = new AWS.CloudFormation();
			 	
			 	cf.createStack(params, function(err, data) {
			 		if (err) {
			 			l.error("Problem creating stack", err)
			 		} else {
			 			waitForStack(cf, options['stack-name'], 'CREATE_COMPLETE', function(err) {
			 				if (err) {
			 					l.error(err);
			 				} else {
			 					l.success("DONE!");
			 				}
			 			})
			 		}
			 	})

		 	} else {
		 		// TODO: problem here. Could not locate master template URL after
		 		// it has apparently been successfully uploaded
		 	}		 	
		 }
	});
}

function buildCreateTemplateParamers(masterTemplateUrl, options) {

	var params = {
		StackName   : options['stack-name'],
		Parameters  : [],
		Tags        : [],
		TemplateURL : masterTemplateUrl
	}

	var templateParameters = options.params || {};

	templateParameters.Version = options.version;
	templateParameters.TemplateBaseUrl = masterTemplateUrl.substring(0, masterTemplateUrl.lastIndexOf("/"));

	_.each(templateParameters, function(value, key) {
		params.Parameters.push({
			ParameterKey   : key,
			ParameterValue : value
		});
	});

	_.each(options.tags || {}, function(value, key) {
		params.Tags.push({
			Key   : key,
			Value : value
		});
	});

		// TODO: Add Capabilities

	return params;
}

function update(options) {}

function parseCliCommands(parser) {
	buildCliCommands(parser);
	parser.parse();
}

function buildCliCommands(parser) {

	function doCommand(command) {
		return function(options) {
			main(command, options);
		}
	}

	addCommonCliOptions(parser.command('create'))
		.option('tags', {
	        help: 'Tags to use during stack creation. Format is "tag_one_name:tag_one_value,tag_two_name:tag_two_value"',
	        transform: parseCliObjectString
	    })
	    .callback(doCommand('create'))
		.help("Create the stack for the first time");

	addCommonCliOptions(parser.command('update'))
		.callback(doCommand('update'))
		.help("Update an existing stack");	
}

function addCommonCliOptions(command) {
	return command.option('stack-name', {
        required: true,
        help: 'The name of the stack that will be created or updated'
    })
    .option('region', {
        required: true,
        help: 'The region to deploy to'
    })
    .option('main-template', {
        required: true,
        help: 'Name of the main template. Main template must be in template folder specified by template-folder'
    })
    .option('template-folder', {
        required: true,
        help: 'Folder containing cloud formation templates'
    })
    .option('bucket', {
        required: true,
        help: 'The bucket to upload all template files to'
    })
    .option('version', {
        help: 'The version label to use for the deployment',
        default : guid.raw()
    })
    .option('params', {  
    	type: "string",
        help: 'Params to pass when creating/updating the cloud formation stack. Format is "param one name:param_one_value,param two name:param_two_value"',
        transform: parseCliObjectString
    })    
    .option('aws-access-key-id', {
        help: 'AWS access key to use'
    })
    .option('aws-secret-access-key', {
        help: 'AWS access key to use'
    })
}

function parseCliObjectString(str) {
	var pairs = str.split(","),
        		opts = {};

	for(var i in pairs) {
		var pair = pairs[i].split(":");
		
		if (pair.length != 2) {
			throw "Error parsing object from string. Check format. String given was '" + str + "'"
		}

		var	key  = pair[0].replace(/^\s+|\s+$/g, '');
			val  = pair[1].replace(/^\s+|\s+$/g, '');

		opts[key] = val;
	}

	return opts;
}



function uploadTemplates (baseDir, templateFolder, bucket, version, cb) {
	buildTemplateUploadList(baseDir, templateFolder, version, function(err, uploadList) {
		if (err) {
			cb(err);
		} else {
			var result = [],
				s3     = new AWS.S3(),
				error  = false;

			_.each(uploadList, function(item) {
				var stream = fs.createReadStream(item.src),
					key    = item.dest;
				
				upload(s3, bucket, key, stream, function(err, data) {
					error |= !!err;
					
					result.push({
						error : err,
						data  : data
					});

					if (result.length == uploadList.length) {
						cb(error, result);
					}
				});
			});
		}
	});
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
	});
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