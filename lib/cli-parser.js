var guid = require('guid');

module.exports = {
    parse : parse
}

function parse(parser, main) {

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

	parser.parse();
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