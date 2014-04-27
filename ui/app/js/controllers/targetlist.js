ircboksControllers.controller('targetListCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session', 'MsgHistService', 'Target',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session, MsgHistService, Target) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;
	$scope.histdict = MsgHistService.histdict;
	if ($scope.activeChan === undefined) {//temporary hack for our status page
		$scope.activeChan = $scope.activeServer;
	}

	$scope.killMe = function () {
		Session.killMe();
	};

	/**
	* ask ircboks client to dump all info about the client
	*/
	$scope.askDumpInfo = function () {
		var msg = {
			event: 'ircBoxInfo',
			domain: 'irc',
			userId: Session.userId
		};
		wsock.send(JSON.stringify(msg));
	};

	//handle JOIN event
	$scope.$on("JOIN", function (event, msg) {
		if (msg.nick == Session.nick) {
			Target.delTargetChannel(msg.args[0]);
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
		Target.setTargetChannels(msg.chanlist);
		$scope.chanlist = Target.targetChannels;
		$scope.$apply();
	});

	/**
	* PRIVMSG handler
	*/
	$scope.$on('ircPrivMsg', function (event, msg) {
		//add user to userlist if it is message to us
		if (msg.target[0] != "#") {
			Target.addTarget(msg.nick);
		} else {
			Target.addTarget(msg.target);
		}
		$scope.$apply();
	});

	$scope.$on("$routeChangeSuccess", function (event, next, current) {
		$scope.chanlist = Target.targetChannels;
		$scope.userlist = Target.targetNicks;

		if ($scope.chanlist.length === 0) {
			$scope.askDumpInfo();
		}

		if ($scope.activeChan[0] != "#" && $scope.activeChan != $scope.activeServer) {
			Target.addTarget($scope.activeChan);
		}
	});

}]);
