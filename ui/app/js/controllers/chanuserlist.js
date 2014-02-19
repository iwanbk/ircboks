ircboksControllers.controller('ChanUserListCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session', 
	function ($scope, $rootScope, $routeParams, $location, wsock, Session) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;

	/**
	* ask ircboks client to dump all info about the client
	*/
	$scope.askDumpInfo = function () {
		var msg = {
			event: 'ircBoxInfo',
			data: {
				userId: Session.userId
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//handle JOIN event
	$scope.$on("JOIN", function (event, msg) {
		if (msg.nick == Session.nick) {
			$scope.askDumpInfo();
		}
	});

	//handle PART event
	$scope.$on("PART", function (event, msg) {
		if (msg.nick == Session.nick) {
			$scope.askDumpInfo();
		}
	});


	/**
	* ircBoxInfo contain all global info about this user.
	*/
	$scope.$on('ircBoxInfo', function (event, msg) {
		Session.setTargetChannels(msg.chanlist);
		$scope.chanlist = Session.targetChannels;
	});

	/**
	* PRIVMSG handler
	*/
	$scope.$on('ircPrivMsg', function (event, msg) {
		//add user to userlist if it is message to us
		if (msg.target[0] != "#") {
			Session.addTarget(msg.nick);
		} else {
			Session.addTarget(msg.target);
		}
		$scope.$apply();
	});

	$scope.$on("$routeChangeSuccess", function (event, next, current) {
		$scope.chanlist = Session.targetChannels;
		$scope.userlist = Session.targetNicks;

		if ($scope.chanlist.length === 0) {
			$scope.askDumpInfo();
		}

		if ($scope.activeChan[0] == "#") {
			Session.addTarget($scope.activeChan);
		}
	});

}]);
