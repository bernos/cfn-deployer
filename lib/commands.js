var path 		= require('path'),
	glob   		= require('glob'),
	AWS    		= require('aws-sdk'),
	fs     		= require('fs'),
	_      		= require('lodash'),
	l      		= require('./logger.js'),
	s3          = require('./s3.js'),
	EventLogger = require('./stack-event-logger.js');	

module.exports = {
	create : function(config, cb) {

		s3.uploadFolder(config.TemplateFolder, config.Bucket, config.Version, wrap(cb, function(result) {
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