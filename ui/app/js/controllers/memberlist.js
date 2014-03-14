ircboksControllers.controller('MemberListCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;
	if ($scope.activeChan === undefined) {//temporary hack for our status page
		$scope.activeChan = $scope.activeServer;
	}

	$scope.$on("$routeChangeSuccess", function (event, next, current) {
		if (!Session.isLoggedIn()) {
			return;
		}
		Session.checkInitMember($scope.activeChan);
		$scope.members = Session.memberdict[$scope.activeChan];
	});

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

	/**
	* handle PART event.
	* If it is our own nick : del Members object of this channel
	* if not : del this nick from the channel's members
	*/
	$scope.$on("PART", function (event, msg) {
		var chan_name = msg.args[0];
		if (msg.nick == Session.nick) {
			Session.destroyMembers(chan_name);
		} else {
			Session.delMember(msg.nick, chan_name);
		}
		$scope.$apply();
	});

	//handle QUIT event
	$scope.$on("QUIT", function (event, msg) {
		Session.delMemberFromAll(msg.nick);
		$scope.$apply();
	});

	//handle NICK event
	$scope.$on("NICK", function (event, msg) {
		var oldNick = msg.nick;
		var newNick = msg.message;
		var chanJoined = Session.delMemberFromAll(oldNick);
		for (var i in chanJoined) {
			Session.addMember(newNick, chanJoined[i]);
		}
		$scope.$apply();
	});
}]);
