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
	_      = require('lodash');

buildCliCommands(parser);
parser.parse();

function create(options) {
	buildTemplateUploadList(process.cwd(), options['template-folder'], options.version, function(err, uploadList) {
		console.log(uploadList)
	});
}

function update(options) {}

function buildCliCommands(parser) {

	addCommonCliOptions(parser.command('create'))
		.option('tags', {
	        help: 'Tags to use during stack creation. Format is "tag_one_name:tag_one_value,tag_two_name:tag_two_value"',
	        transform: parseCliObjectString
	    })
	    .callback(create)
		.help("Create the stack for the first time");

	addCommonCliOptions(parser.command('update'))
		.callback(update)
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