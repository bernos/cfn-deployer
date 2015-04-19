var path = require('path');

module.exports = {
	loadConfig : loadConfig,
	validate   : validate
}

function loadConfig(options, cb) {	
	var configFile = path.join(process.cwd(), options.config), 
		config     = require(configFile);
		
	mergeOptions(configFile, config, options);

	validate(config, cb);
}

function mergeOptions(configFile, config, options) {
	config.Version 			= options.version;
	config.AccessKeyId 		= options['access-key-id'];
	config.SecretAccessKey 	= options['secret-access-key'];
	config.TemplateFolder 	= path.join(path.dirname(configFile), config.TemplateFolder);
}

function validate(config, cb) {
	if (!config.StackName) 		{ return cb("StackName is required"); }
	if (!config.Version)   		{ return cb("Version is required"); }
	if (!config.Region)    		{ return cb("Region is required"); }
	if (!config.TemplateFolder) { return cb("TemplateFolder is required"); }
	if (!config.MainTemplate)	{ return cb("MainTemplate is required"); }
	if (!config.Bucket)			{ return cb("Bucket is required"); }

	cb(null, config);
}