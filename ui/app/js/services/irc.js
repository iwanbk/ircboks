angular.module('ircServices', ['comm', 'session'])
.factory('ircCommand', ['$rootScope', 'wsock', 'Session',  function ($rootScope, wsock, Session) {
	var Service = {
	};

	/**
	* Get topic of a channel.
	*/
	Service.topicGet = function (channel) {
		console.log("topicGet chan:"+channel);
		if (channel[0] != '#') {
			return;
		}
		var command = {
			event: 'topic',
			userId: Session.userId,
			data: {
				channel: channel,
				topic: ''
			}
		};
		sendCommand(command);
	};

	var sendCommand = function (command) {
		command.domain = 'irc';
		wsock.sendCommand(command);
	};
	
	return Service;
}])
;