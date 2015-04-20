var AWS = require('aws-sdk'),
	l   = require('./logger.js'),
	_   = require('lodash'),
	EventLogger = require('./stack-event-logger.js');

module.exports = {
	createStack : createStack
}

/**
 * Creates a cloud formation stack and waits for the resulting stack to reach
 * CREATE_COMPLETE status. This is essentially a proxy through to the
 * createStack method on the aws SDK
 *
 * @param {object} params
 * @param {function} cb
 */
function createStack(params, cb) {
	var cf = new AWS.CloudFormation();
	
	cf.createStack(params, function(err, data) {
 		err ? cb(["Failed to create stack", err]) 
			: waitForStack(cf, params.StackName, 'CREATE_COMPLETE', cb);
 	});
}

/**
 * Waits for a cloudformation stack to reach the requested status
 *
 * @param {object} cf - cloudFormation service
 * @param {string} stackName
 * @param {string} status
 * @param {function} cb
 */
function waitForStack(cf, stackName, status, cb) {

    l.info("Waiting for stack %s to reach status %s.", stackName, status);

    var eventLogger = new EventLogger(cf, stackName, l.info, 2500);
		eventLogger.start();

	(function checkStatus(stackName, status, cb) {
        cf.describeStacks ({
            StackName : stackName
        }, function(err, data) {
            if (err) {
            	eventLogger.stop();
                cb(err);
            } else {
                var stack = _.find(data.Stacks , { StackName  : stackName });

                if (!stack) {
            	    eventLogger.stop();
            		cb("could not locate stack");
                } else if (stack.StackStatus  == status) {
            		eventLogger.stop();
                    cb(false)
                } else {
                    _.delay(checkStatus, 10000, stackName, status, cb);
                }
            }
        })
    })(stackName, status, cb);
}
