var path = require('path'),
	_    = require('lodash'),
	cfn  = require('./cfn.js'),
	s3   = require('./s3.js'),
	cfg  = require('./config.js');

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
	cfg.validate(config, function(err) {
		if (err) cb(err);
		
		var folder  = config.TemplateFolder,
			bucket  = config.Bucket,
			version = config.Version,
			main    = config.MainTemplate;

		uploadTemplates(folder, main, bucket, version, function(err, mainTemplateUrl) {
			err ? cb(err) : cfn.createStack(buildCreateStackParameters(mainTemplateUrl, config), cb);
		});
	});	
}

/**
 * Updates an existing stack using the provided config
 *
 * @param {object} config
 * @param {function} cb
 */
function update(config, cb) {
	cfg.validate(config, function(err) {
		if (err) cb(err);

		var folder  = config.TemplateFolder,
			bucket  = config.Bucket,
			version = config.Version,
			main    = config.MainTemplate;

		uploadTemplates(folder, main, bucket, version, function(err, mainTemplateUrl) {
			err ? cb(err) : cfn.updateStack(buildUpdateStackParameters(mainTemplateUrl, config), cb);
		});
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
	s3.uploadFolder(templateFolder, bucket, version + "/cfn", function(err, result) {
		if (err) {
			cb(["Failed to upload templates.", err]);
		} else {
			var template = findMainTemplateUrl(mainTemplate, _.pluck(result, 'Location'));
			cb(template ? null : "Could not find main template URL", template);
		}
	});
}

/**
 * Uploads source folder to S3. Source folder will be zipped first, so that it can
 * easily by downloaded to ec2 instances during deployment
 *
 * @param {string} sourceFolder
 * @param {string} bucket
 * @param {string} version
 * @param {function} cb
 */
function uploadSource(sourceFolder, bucket, version cb) {
	var archive = path.join(process.cwd(), 'tmp', version, 'source.zip');

	zipFolder(sourceFolder, archive, function(err) {
		if (err) {
			cb(err);
		} else {
			s3.uploadFile(bucket, version + "/source.zip", archive, function(err) {
				
			});
		}
	});
	// upload zip
}

/**
 * Recursively zips a folder
 *
 * @param {string} source
 * @param {string} dest
 * @param {function} cb
 */
function zipFolder(source, dest, cb) {

}

/**
 * Locates the url of the main template within the provided list of urls
 *
 * @param {string} mainTemplate
 * @param {array} urls
 * @return {string}
 */
function findMainTemplateUrl(mainTemplate, urls) {
	return _.find(urls, function(url) {
		return url.split("/").pop() == mainTemplate;
	});
}

/**
 * Builds params object for use with aws sdk cloudformation service createStack
 * method.
 *
 * @param {string} masterTemplateUrl
 * @param {object} config
 * @return {object}
 */
function buildCreateStackParameters(masterTemplateUrl, config) {
	var params = buildUpdateStackParameters(masterTemplateUrl, config);
		params.Tags = _map(config.Tags || {}, kvToStackTag);

	return params;
}

/**
 * Builds params object for use with aws sdk cloudformation service updateStack
 * method.
 *
 * @param {string} masterTemplateUrl
 * @param {object} config
 * @return {object}
 */
function buildUpdateStackParameters(masterTemplateUrl, config) {
	var templateParameters = config.Params || {};
		templateParameters.Version = config.Version;
		templateParameters.TemplateBaseUrl = masterTemplateUrl.substring(0, masterTemplateUrl.lastIndexOf("/"));
	
	return {
		StackName    : config.StackName,
		Parameters   : _.map(templateParameters, kvToStackParameter),
		TemplateURL	 : masterTemplateUrl,
		Capabilities : config.Capabilities || []
	};
}

/**
 * Transforms key and value into stack Parameter object for use with calls to aws sdk
 * cloudformation service
 *
 * @param {string} value
 * @param {string} key
 * @return {object}
 */
function kvToStackParameter(value, key) {
	return {
		ParameterKey   : key,
		ParameterValue : value
	};
}

/**
 * Transforms key and value into stack Tag object for use with calls to aws sdk
 * cloudformation service
 *
 * @param {string} value
 * @param {string} key
 * @return {object}
 */
function kvToStackTag(value, key) {
	return {
		Key   : key,
		Value : value
	};
}
