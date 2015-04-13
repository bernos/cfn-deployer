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

var parser = require('nomnom');

buildCliCommands(parser);
parser.parse();

function buildCliCommands(parser) {

	addCommonCliOptions(parser.command('create'))
		.option('tags', {
	        help: 'Tags to use during stack creation. Format is "tag_one_name:tag_one_value,tag_two_name:tag_two_value"',
	        transform: parseCliObjectString
	    })
	    .callback(function(opts) {
			console.log("running create ", opts)
		})
		.help("Create the stack for the first time");

	addCommonCliOptions(parser.command('update'))
		.callback(function(opts) {
			console.log("running update ", opts)
		})
		.help("Update an existing stack");	
}

function addCommonCliOptions(command) {
	return command.option('stackname', {
        required: true,
        help: 'The name of the stack that will be created or updated'
    })
    .option('region', {
        required: true,
        help: 'The region to deploy to'
    })
    .option('template', {
        required: true,
        help: 'Path to template to deploy'
    })
    .option('child-templates', {
        required: true,
        help: 'Glob matching template files to upload'
    })
    .option('bucket', {
        required: true,
        help: 'The bucket to upload all template files to'
    })
    .option('version', {
        help: 'The version label to use for the deployment'
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