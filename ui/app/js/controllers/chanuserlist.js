ircboksControllers.controller('ChanUserListCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 
	function ($scope, $rootScope, $routeParams, $location, wsock) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;

	var init = function () {
		if (!$rootScope.isLogin) {
			return;
		}
		if ($rootScope.chanlist === undefined) {
			$scope.askDumpInfo();
			$rootScope.chanlist = [];
		}
		if ($rootScope.userlist === undefined) {
			$rootScope.userlist = [];	
		}
		//check if this user already added to the list
		if ($scope.activeChan[0] != "#") {
			if ($rootScope.userlist.indexOf($scope.activeChan) == -1) {
				$rootScope.userlist.push($scope.activeChan);
			}
		}
	};
	

	$scope.$on('loginResult', function (event, msg) {
		if (msg.result === true) {
			$scope.askDumpInfo();
			console.log("askDumpInfo");
		}
	});

	/**
	* ask ircboks client to dump all info about the client
	*/
	$scope.askDumpInfo = function () {
		var msg = {
			event: 'ircBoxInfo',
			data: {
				userId: $rootScope.userId
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//handle JOIN event
	$scope.$on("JOIN", function (event, msg) {
		if (msg.nick == $rootScope.nick) {
			$scope.askDumpInfo();
		}
	});

	//handle PART event
	$scope.$on("PART", function (event, msg) {
		if (msg.nick == $rootScope.nick) {
			$scope.askDumpInfo();
		}
	});


	/**
	* ircBoxInfo contain all global info about this user.
	*/
	$scope.$on('ircBoxInfo', function (event, msg) {
		$scope.$apply(function(){
			$rootScope.chanlist = [];
			for (var i in msg.chanlist) {
				var chan = {
					name: msg.chanlist[i],
					encName: encodeURIComponent(msg.chanlist[i])
				};
				$rootScope.chanlist.push(chan);
			}
		});
	});

	/**
	* PRIVMSG handler
	*/
	$scope.$on('ircPrivMsg', function (event, msg) {
		if (msg.target[0] == "#") {
			tabName = msg.nick;
			isChanMsg = false;
			if ($rootScope.userlist.indexOf(msg.nick) == -1) {
				$rootScope.userlist.push(msg.nick);
				$scope.$apply();
			}
		}
	});
	init();
}]);
