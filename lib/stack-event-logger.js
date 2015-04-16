var _ = require('lodash');

module.exports = function(cfnClient, stackName, logFunction, interval) {
    var _stopped = true,
        _events  = [];

    function tick() {
        cfnClient.describeStackEvents({
            StackName: stackName
        }, function(err, data) {
            if (!err) {

                data.StackEvents.reverse();

                _.each(data.StackEvents, function(e) {
                    if (!_.contains(_events, e.EventId)) {
                        logFunction("%s %s %s %s", e.Timestamp.toISOString(), e.LogicalResourceId, e.ResourceType, e.ResourceStatus);
                        _events.push(e.EventId);
                    }
                });
            } else {
                logFunction("Error getting stack events: ")
            }

            if (!_stopped) {
                _.delay(tick, interval);
            }
        });
    }

    this.start = function() {
        _stopped = false;
        tick();
    }

    this.stop = function() {
        _stopped = true;
    }
}