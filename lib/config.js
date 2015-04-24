/**
 * Configuration functions
 */
var path = require('path'),
	AWS  = require('aws-sdk');

module.exports = {
	loadConfig   : loadConfig,
	validate     : validate,
	configureAws : configureAWS
}

/**
 * Loads configuration file from disk (using config file specified in command 
 * line options), and then merges command line options onto the loaded config.
 * Callback function receives final config object
 *
 * @param {object} options
 * @param {function} cb
 */ 
function loadConfig(options, cb) {	
	var configFile = path.join(process.cwd(), options.config), 
		config     = require(configFile);
		
	mergeOptions(configFile, config, options);

	validate(config, cb);
}

/**
 * Merges command line options onto config object loaded from disk.
 *
 * @param {string} configFile
 * @param {object} config
 * @param {object} options
 */
function mergeOptions(configFile, config, options) {
	config.Version 			= options.version;
	config.AccessKeyId 		= options['access-key-id'];
	config.SecretAccessKey 	= options['secret-access-key'];
	config.TemplateFolder 	= path.join(path.dirname(configFile), 
										config.TemplateFolder);
}

/**
 * Validates configuration object. If there are any any errors callback will
 * be called with a description of the validation error as the standard 'err'
 * first positional argument.
 *
 * @param {object} config
 * @param {function} cb
 */
function validate(config, cb) {
	if (!config.StackName) 		{ return cb("StackName is required"); }
	if (!config.Version)   		{ return cb("Version is required"); }
	if (!config.Region)    		{ return cb("Region is required"); }
	if (!config.TemplateFolder) { return cb("TemplateFolder is required"); }
	if (!config.MainTemplate)	{ return cb("MainTemplate is required"); }
	if (!config.Bucket)			{ return cb("Bucket is required"); }

	cb(null, config);
}

/**
 * Configures global AWS object with values from configuration object
 *
 * @param {object} config
 */
function configureAWS(config) {
	AWS.config.update({
		region : config.Region
	});

	if (config.AccessKeyId && config.SecretAccessKey) {
		AWS.config.update({
			accessKeyId 	: config.AccessKeyId,
			secretAccessKey : config.SecretAccessKey 
		});
	}
}
