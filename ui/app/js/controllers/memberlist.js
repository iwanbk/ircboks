ircboksControllers.controller('MemberListCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 
	function ($scope, $rootScope, $routeParams, $location, wsock) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;

	var init = function () {
		if (!$rootScope.isLogin) {
			return;
		}
		if ($rootScope.membersdict === undefined) {
			$rootScope.membersdict = {};
		}

		if ($rootScope.membersdict[$scope.activeChan] === undefined ) {
			askChannelNames($scope.activeChan);
		}
	};

	/**
	* send NAMES command.
	*/
	var askChannelNames = function (channel) {
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
		//initialize Members object, if still empty
		//TODO : we need to check if we really need NAMES list of this channel
		if ($rootScope.membersdict[msg.channel] === undefined) {
			$rootScope.membersdict[msg.channel] = new Members();
		}

		//add members
		$rootScope.membersdict[msg.channel].add(msg.names, msg.end);
		$scope.$apply();
	});

	//handle JOIN event
	$scope.$on("JOIN", function (event, msg) {
		var channame = msg.args[0];
		$rootScope.membersdict[channame].addNick(msg.nick);
		$scope.$apply();
	});

	//handle PART event
	$scope.$on("PART", function (event, msg) {
		var channame = msg.args[0];
		$rootScope.membersdict[channame].delNick(msg.nick);
		$scope.$apply();
	});

	//handle QUIT event
	$scope.$on("QUIT", function (event, msg) {
		for (var key in $rootScope.members) {
			if (key[0] == "#") {
				$rootScope.membersdict[key].delNick(msg.nick);
			}
		}
		$scope.$apply();
	});
	init();
}]);
