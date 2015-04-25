var uuid = require('node-uuid');

module.exports = {
    parse : parse
}

/**
 * Parses cli options
 *
 * @param {object} parser
 * @param {function} cb
 */
function parse(parser, cb) {
	addCommonCliOptions(parser.command('create'))
		.callback(makeCommandCallback('create', cb))
		.help("Create the stack for the first time");

	addCommonCliOptions(parser.command('update'))
		.callback(makeCommandCallback('update', cb))
		.help("Update an existing stack");	

	parser.parse();
}

/**
 * Creates and returns callback function ready to be uses as the callback to 
 * handle commands parsed by our cli parser
 *
 * @param {string} command
 * @param {function} cb
 */
function makeCommandCallback(command, cb) {
	return function(options) {
		cb(null, command, options);
	}
}

/**
 * Adds cli options common to all commands
 *
 * @param {object} command
 * @return {object}
 */
function addCommonCliOptions(command) {
	return command.option('config', {
        help: 'Path to configuration file',
        required: true
    })
    .option('version', {
        help: 'The version label to use for the deployment',
        default : uuid.v4()
    })    
    .option('access-key-id', {
        help: 'AWS access key to use'
    })
    .option('secret-access-key', {
        help: 'AWS access key to use'
    });
}

/**
 * Parses command line string into object. String format is
 * key:value,key:value
 *
 * @deprecated
 * @param {string} str
 * @return {object}
 */
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
