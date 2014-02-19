ircboksControllers.controller('MemberListCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;

	$scope.$on("$routeChangeSuccess", function (event, next, current) {
		if (Session.memberdict[$scope.activeChan] === undefined) {
			askChannelNames($scope.activeChan);
			Session.memberdict[$scope.activeChan] = new Members();
		}
		$scope.members = Session.memberdict[$scope.activeChan];
	});

	/**
	* send NAMES command.
	*/
	var askChannelNames = function (channel) {
		if (channel[0] != "#") {
			return;
		}
		var msg = {
			event:"ircNames",
			data: {
				userId: $rootScope.userId,
				channel: channel
			}
		};
		wsock.send(JSON.stringify(msg));
	};

		/**
	* channelNames message is message that contain list of channel members.
	* it is 353 and 366 code
	*/
	$scope.$on('channelNames', function (event, msg) {
		//TODO : we need to check if we really need NAMES list of this channel
		if (!msg.end) {
			Session.addMemberArr(msg.names, msg.channel);
		}
		$scope.$apply();
	});

	//handle JOIN event
	$scope.$on("JOIN", function (event, msg) {
		var chan_name = msg.args[0];
		Session.addMember(msg.nick, chan_name);
		$scope.$apply();
	});

	//handle PART event
	$scope.$on("PART", function (event, msg) {
		var chan_name = msg.args[0];
		Session.delMember(msg.nick, chan_name);
		$scope.$apply();
	});

	//handle QUIT event
	$scope.$on("QUIT", function (event, msg) {
		Session.delMemberFromAll(msg.nick);
		$scope.$apply();
	});
}]);
