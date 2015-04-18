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
		.callback(doCommand('create'))
		.help("Create the stack for the first time");

	addCommonCliOptions(parser.command('update'))
		.callback(doCommand('update'))
		.help("Update an existing stack");	

	parser.parse();
}

function addCommonCliOptions(command) {
	return command.option('config', {
        help: 'Path to configuration file',
        required: true
    })
    .option('version', {
        help: 'The version label to use for the deployment',
        default : guid.raw()
    })    
    .option('access-key-id', {
        help: 'AWS access key to use'
    })
    .option('secret-access-key', {
        help: 'AWS access key to use'
    });
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