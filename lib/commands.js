var path 		= require('path'),
	AWS    		= require('aws-sdk'),
	fs     		= require('fs'),
	_      		= require('lodash'),
	l      		= require('./logger.js'),
	cfn         = require('./cfn.js'),
	s3          = require('./s3.js');

module.exports = {
	create : create,
	update : update
}

/**
 * Creates a new stack using the provided config.
 *
 * @param {object} config
 * @param {function} cb
 */
function create(config, cb) {
	var folder  = config.TemplateFolder,
		bucket  = config.Bucket,
		version = config.Version;

	s3.uploadFolder(folder, bucket, version, wrap(cb, function(result) {
	 	var templateUrls = _.map(result, function(i) { return i.Location; });
			mainTemplate = findMainTemplateUrl(config.MainTemplate, templateUrls);
			
		if (!mainTemplate) {
			cb("Could not find main template URL");
		} else {
	        cfn.createStack(buildCreateTemplateParameters(mainTemplate, config), cb);	
		}
	}, "Upload failed with the following errors "));
}

function update(config, cb) {

}

function wrap(cb, fn, msg) {
	// TODO: allow more than one result
	return function(err, result) {
		err ? cb([msg, err]) : fn(result, cb);
	}
}

function findMainTemplateUrl(mainTemplate, urls) {
	return _.find(urls, function(url) {
		return url.split("/").pop() == mainTemplate;
	});
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
