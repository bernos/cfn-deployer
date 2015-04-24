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
		version = config.Version,
		main    = config.MainTemplate;

	uploadTemplates(folder, main, bucket, version, function(err, mainTemplateUrl) {
		err ? cb(err) : cfn.createStack(buildCreateStackParameters(mainTemplateUrl, config), cb);
	});
}

function update(config, cb) {
	var folder  = config.TemplateFolder,
		bucket  = config.Bucket,
		version = config.Version,
		main    = config.MainTemplate;

	uploadTemplates(folder, main, bucket, version, function(err, mainTemplateUrl) {
		err ? cb(err) : cfn.updateStack(buildUpdateStackParameters(mainTemplateUrl, config), cb);
	});
}

/**
 * Uploads all templates in a folder to S3 and determines the URL of the main
 * template. Callback will receive the URL of the main template
 *
 * @param {string} templateFolder
 * @param {string} bucket
 * @param {string} version
 * @param {function} cb
 */
function uploadTemplates(templateFolder, mainTemplate, bucket, version, cb) {
	s3.uploadFolder(templateFolder, bucket, version, function(err, result) {
		if (err) {
			cb(["Failed to upload templates.", err]);
		} else {
			var urls     = _.map(result, function(i) { return i.Location; }),
				template = findMainTemplateUrl(mainTemplate, urls);

			cb(template ? null : "Could not find main template URL", template);
		}
	});
}

function findMainTemplateUrl(mainTemplate, urls) {
	return _.find(urls, function(url) {
		return url.split("/").pop() == mainTemplate;
	});
}

function buildCreateStackParameters(masterTemplateUrl, config) {
	var params = buildUpdateStackParameters(masterTemplateUrl, config);
		params.Tags = _map(config.Tags || {}, kvToStackTag);

	return params;
}

function buildUpdateStackParameters(masterTemplateUrl, config) {
	var templateParameters = config.Params || {};
		templateParameters.Version = config.Version;
		templateParameters.TemplateBaseUrl = masterTemplateUrl.substring(0, masterTemplateUrl.lastIndexOf("/"));
	
	// TODO: Add Capabilities
	
	return {
		StackName   : config.StackName,
		Parameters  : _.map(templateParameters, kvToStackParameter),
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
