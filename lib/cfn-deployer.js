var nomnom 		= require('nomnom'),
	config      = require('./config'),
	AWS    		= require('aws-sdk'),
	l      		= require('./logger.js'),
	CliParser 	= require('./cli-parser.js'),
	commands    = require('./commands.js');

CliParser.parse(nomnom, main);

function main(command, options) {
	config.loadConfig(options, function(err, config) {
		if (err) {
			l.err("Error loading configuration. %s", err);
		} else {			
			configureAWS(config);			

			switch(command) {
				case "create" :
					commands.create(config, commandCallback("create"));
					break;
				case "update" :
					commands.update(config, commandCallback("update"));
					break;
			}
		}
	});	
}

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

function commandCallback(command) {
	return function(err, result) {
		if (err) {
			if (err.constructor !== Array) {
				err = [err];
			}

			err.unshift("Error: ");

			l.error.apply(l, err);
		} else {
			l.success("Command '%s' completed successfully", command);
		}
	}
}

