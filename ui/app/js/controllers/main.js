ircboksControllers.controller('mainCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session', 'MsgHistService',
	function ($scope, $rootScope, $routeParams, $location, wsock,Session, MsgHistService) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;

	if ($scope.activeChan === undefined) {//temporary hack for our status page
		$scope.activeChan = $scope.activeServer;
	}

	$scope.$on("$routeChangeSuccess", function (event, next, current) {
		console.log("main:routeChangeSuccess");
		if (!Session.isLoggedIn()) {
			$location.path("/");
			return;
		}
		MsgHistService.checkInit($scope.activeChan);
		$scope.chat_hist = MsgHistService.getChatHist($scope.activeChan);
		MsgHistService.markAllAsRead($scope.activeChan);
	});

	$scope.$on("$routeChangeStart", function (event, next, current) {
		//save scrolling position
		var chat_hist = MsgHistService.getChatHist($scope.activeChan);
		chat_hist.lastScrollPos = $('#chat').scrollTop();
	});

	$rootScope.$on("ircClientDestroyed", function () {
		$location.path("/");
		$scope.$apply();
	});
	/**
	* Message history of a nick
	*/
	$scope.$on("msghistNickResp", function (event, msg) {
		if (msg.logs === undefined || msg.logs === null || msg.logs.length === 0) {//empty logs
			return;
		}
		Session.addTarget(msg.nick);
		for (i = 0; i <  msg.logs.length; i++) {
			var obj = msg.logs[i];
			var readFlag = obj.ReadFlag;

			if ($scope.activeChan === obj.Nick) {
				readFlag = true;
			}
			var message = new Message(obj.Message, obj.Timestamp, obj.Nick, obj.Target, readFlag, "PRIVMSG", obj.Id);
			
			MsgHistService.addNewMsgFront(msg.nick, message);

			if (readFlag === true && obj.ReadFlag === false) {
				MsgHistService.markAsRead(msg.nick, obj.Id);
			}
		}
		$scope.$apply();
	});

	/**
	* msghistChannel is a message that contains channel message logs/history
	*/
	$scope.$on('msghistChannel', function (event, msg) {
		if (msg.logs === undefined || msg.logs === null) {//empty logs
			return;
		}
		for (i = 0; i <  msg.logs.length; i++) {
			var obj = msg.logs[i];
			var readFlag = obj.ReadFlag;

			if ($scope.activeChan === obj.Target) {
				readFlag = true;
			}

			var message = new Message(obj.Message, obj.Timestamp, obj.Nick, obj.Target, readFlag, "PRIVMSG", obj.Id);
			MsgHistService.addNewMsgFront(msg.channel, message);

			if (readFlag === true && obj.ReadFlag === false) {
				MsgHistService.markAsRead(obj.Target, obj.Id);
			}
		}
		$scope.$apply();
	});


	/**
	* PRIVMSG handler
	*/
	$scope.$on('ircPrivMsg', function (event, msg) {
		var tabName = "";

		//update chattab & chanlist/otheruserlist
		if (msg.target[0] == "#") {
			tabName = msg.target;
		} else {
			tabName = msg.nick;
		}

		var readFlag = msg.readFlag;

		if (tabName == $scope.activeChan) {
			readFlag = true;
		}
		var msgObj = new Message(msg.message, msg.timestamp, msg.nick, msg.target, readFlag, "PRIVMSG", msg.oid);
		MsgHistService.addNewMsg(tabName, msgObj);
		
		$scope.$apply();

		if (readFlag === true && msg.readFlag === false) {
			MsgHistService.markAsRead(tabName, msg.oid);
		}
	});

	//handle JOIN event
	$scope.$on("JOIN", function (event, msg) {
	});

	//handle PART event
	$scope.$on("PART", function (event, msg) {
		var channame = msg.args[0];
	});

	//handle QUIT event
	$scope.$on("QUIT", function (event, msg) {
	});

	$scope.$on('ircBoxInfo', function (event, msg) {
		if (msg.chanlist === undefined || msg.chanlist === null) {
			return;
		}
		for (i = 0; i < msg.chanlist.length; i++) {
			MsgHistService.checkInit(msg.chanlist[i]);
		}
	});

	//check if we need to show date
	$scope.showDate = function (idx, messages) {
		if (idx === 0) {
			return true;
		}
		var prevDate = new Date(messages[idx-1].timestamp).getDate();
		var curDate = new Date(messages[idx].timestamp).getDate();
		return prevDate != curDate;
	};

	//initController();

	var addToStatusPage = function (msg, eventType) {
		var timestamp;
		if (msg.timestamp === undefined) {
			timestamp = new Date().getTime();
		} else {
			timestamp = msg.timestamp * timestamp;
		}
		var msgObj = new Message(msg.message, timestamp, msg.nick, msg.target, true, eventType);
		//$rootScope.chattab[$scope.activeServer].messages.push(msgObj);
		MsgHistService.addNewMsg($scope.activeServer, msgObj);
		$scope.$apply();
	};

	//handler when we connected to an irc server
	$scope.$on('001', function (event, msg) {
		addToStatusPage(msg, "001");
	});

	$scope.$on('002', function (event, msg) {
		addToStatusPage(msg, "002");
	});
	$scope.$on('003', function (event, msg) {
		addToStatusPage(msg, "003");
	});
	$scope.$on('004', function (event, msg) {
		addToStatusPage(msg, "004");
	});

	$scope.$on('005', function (event, msg) {
		addToStatusPage(msg, "005");
	});

	$scope.$on('372', function (event, msg) {
		addToStatusPage(msg, "372");
	});

	$scope.$on('NOTICE', function (event, msg) {
		addToStatusPage(msg, "002");
	});

}]);
