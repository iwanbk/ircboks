var ircboksControllers = angular.module('ircboksControllers', ['comm']);

ircboksControllers.controller('loginCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 
	function ($scope, $rootScope, $routeParams, $location, wsock) {

	//user details, just for convenience while in early test
	$scope.userId = "paijo@gmail.com";
	$scope.userPassword = "paijo";

	$scope.nick = "paijon";
	$scope.ircPassword = "";
	$scope.user = "paijon";
	$scope.channel = "#ircboks";
	$scope.server = "irc.freenode.net:6667";

	//states
	$rootScope.isLogin = false;
	$rootScope.isNeedStart = false;
	$rootScope.isReady = false;

	$scope.loginMsg = "Please Login";
	$scope.loginMsgClass = "alert-info";
	$scope.registrationMsg = "";

	//login to ircboks
	$scope.login = function () {
		var msg = {
			'event': 'login',
			'data': {
				'userId': $scope.userId,
				'password': $scope.userPassword
			}
		};
		$rootScope.userId = $scope.userId;
		wsock.send(JSON.stringify(msg));
		$scope.loginMsg = "Logging in....";
	};

	$scope.register = function () {
		if ($scope.newUserPassword1 != $scope.newUserPassword2 || $scope.newUserPassword1.length < 4) {
			$scope.registrationMsg = "Verify that you entered same passwords with minimum 4 characters";
			$scope.registrationClass = "alert-danger";
			return;
		}
		var msg = {
			event: 'userRegister',
			data: {
				userId: $scope.newUserId,
				password: $scope.newUserPassword1
			}
		};
		wsock.send(JSON.stringify(msg));
		$scope.registrationMsg = "Registration Sent. Please Wait";
		$scope.registrationClass = "alert-info";
	};

	//start an IRC client
	$scope.start = function () {
		console.log("starting ircboks client");
		var msg = {
			'event': 'clientStart',
			'data': {
				userId: $rootScope.userId,
				nick: $scope.nick,
				user: $scope.user,
				channel: $scope.channel,
				server: $scope.server,
				password: $scope.ircPassword
			}
		};
		$rootScope.userId = $scope.userId;
		$rootScope.nick = $scope.nick;
		$rootScope.user = $scope.user;
		$rootScope.channel = $scope.channel;
		$rootScope.server = $scope.server;

		wsock.send(JSON.stringify(msg));
	};
	
	$scope.$on('loginResult', function (event, msg) {
		if (msg.result === false) {
			$scope.loginMsgClass = "alert-danger";
			$scope.loginMsg = "Login failed : please check your username & password";
			$scope.$apply();
			console.error("Login failed");
		} else {
			$scope.loginMsgClass = "alert-success";
			$scope.loginMsg = "Login succeed. Initializing your ircboks";
			$scope.$apply();
			$rootScope.isLogin = true;
			if (msg.ircClientExist === true) {
				$rootScope.nick = msg.nick;
				$rootScope.user = msg.user;
				$rootScope.server = msg.server;

				$rootScope.isReady = true; 

				$scope.toChatPage();
			} else {
				$scope.$apply(function(){ 
					$scope.isNeedStart = true;
				});
			}
		}
	});

	$scope.$on("registrationResult", function (event, msg) {
		if (msg.result == "failed") {
			$scope.registrationMsg = "Registration failed : " + msg.reason;
			$scope.registrationClass = "alert-danger";
		} else {
			$scope.registrationMsg = "Registration succeed!. You can now login with your email & password";
			$scope.registrationClass = "alert-success";
		}
		$scope.$apply();
	});

	//go to chat page
	$scope.toChatPage = function () {
		var page = "/" + $rootScope.server + "/" + $rootScope.channel;
		console.log("redirect to :" + page);
		$scope.$apply(function(){
			$location.path(page); 
		});
	};

	$scope.$on('clientStartResult', function (event, msg) {
		if (msg.result == "true") {
			$rootScope.isNeedStart = false;
			$rootScope.isReady = true;
			$scope.toChatPage();
		} else {
			console.error("unhandled event = clientStartResult false");
		}
	});
}]);


ircboksControllers.controller('mainCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 
	function ($scope, $rootScope, $routeParams, $location, wsock) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;

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

	var initController = function () {
		//check if we already login
		if ($rootScope.isLogin === undefined || $rootScope.isLogin === false) {//check if we already login
			if(!$scope.$$phase) {
				$scope.$apply(function(){
					$location.path("/");
				});
			} else {
				$location.path("/");
			}
		}

		//chat tab
		if ($rootScope.chattab === undefined) {
			console.log("initializing chattab");
			$rootScope.chattab = {};
		}

		if ($rootScope.chattab[$scope.activeChan] === undefined) {
			$rootScope.chattab[$scope.activeChan] = {
				name: $scope.activeChan,
				messages: []
			};
		}


		//ask chanlog
		if (!isFirstChanLogAsked($scope.activeChan)) {
			if (isInChannel()) {
				$scope.askChanLog($scope.activeChan);
			} else {
				$scope.askNickLog($scope.activeChan);
			}
		}

	};

	/**
	* isFirstChanLogAsked will return true if log/history for this channel already asked at least once
	*/
	var isFirstChanLogAsked = function (channame) {
		return ($rootScope.chattab[channame] !== undefined && $rootScope.chattab[channame].firstLogAsked !== undefined);
	};

	$scope.askNickLog = function (nick) {
		console.log("askNickLog " + nick);
		$rootScope.chattab[nick].firstLogAsked = true;
		var msg = {
			event: 'msghistNickReq',
			data: {
				userId: $rootScope.userId,
				sender: nick,
				target: $rootScope.nick
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//Ask for channel logs/history
	$scope.askChanLog = function (channame) {
		console.log("ask chan log = " + channame);
		if ($rootScope.chattab[channame] === undefined) {
			$rootScope.chattab[channame] = {
				name: channame,
				messages: []
			};
		}

		$rootScope.chattab[channame].firstLogAsked = true;
		var msg = {
			event: 'msghistChannel',
			data: {
				userId: $rootScope.userId,
				channel:channame
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//send PRIVMSG
	$scope.sendMsg = function (message) {
		console.log("sending message..." + message);
		var msg = {
			event: 'ircPrivMsg',
			data: {
				userId: $rootScope.userId,
				target: $scope.activeChan,
				message: message
			}
		};
		wsock.send(JSON.stringify(msg));

		var timestamp = new Date().getTime();
		var log = {
			message: msg.data.message,
			timestamp: timestamp,
			nick: $rootScope.nick,
			target: msg.data.target
		};

		$rootScope.chattab[$scope.activeChan].messages.push(log);
		$rootScope.chattab[$scope.activeChan].needScrollBottom = true;
	};

	/**
	* Message history of a nick
	*/
	$scope.$on("msghistNickResp", function (event, msg) {
		if (msg.logs === undefined || msg.logs === null) {//empty logs
			return;
		}
		for (i = 0; i <  msg.logs.length; i++) {
			var obj = msg.logs[i];
			var log = {
				message: obj.Message,
				timestamp: obj.Timestamp * 1000,
				nick: obj.Nick,
				target: obj.Target
			};
			$rootScope.chattab[log.nick].messages.unshift(log);
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
			var log = {
				message: obj.Message,
				timestamp: obj.Timestamp * 1000,
				nick: obj.Nick,
				target: obj.Target
			};
			$rootScope.chattab[msg.channel].messages.unshift(log);
		}
		$scope.$apply();
	});


	/**
	* PRIVMSG handler
	*/
	$scope.$on('ircPrivMsg', function (event, msg) {
		var tabName = "";

		var msgObj = msg;
		msgObj.timestamp = msgObj.timestamp * 1000;

		//update chattab & chanlist/otheruserlist
		if (msg.target[0] == "#") {
			tabName = msg.target;
		} else {
			tabName = msg.nick;
		}

		if ($rootScope.chattab[tabName] === undefined) {
			console.log("create new chattab for tabName = " + tabName);
			var new_tab = {
				name:tabName,
				messages:[]
			};
			$rootScope.chattab[tabName] = new_tab;
		}
		$rootScope.chattab[tabName].messages.push(msgObj);
		$rootScope.chattab[tabName].needScrollBottom = true;
	});

	$scope.ircJoin = function (channel) {
		var msg = {
			event: 'ircJoin',
			data: {
				userId: $rootScope.userId,
				channel: channel
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//handler when we connected to an irc server
	$scope.$on('001', function (event, msg) {
		$scope.ircJoin($scope.channel);
		console.log("connected to server");
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


	/**
	* ircBoxInfo contain all global info about this user.
	*/
	$scope.$on('ircBoxInfo', function (event, msg) {
		$scope.$apply(function(){
			for (var i in msg.chanlist) {
				//ask chan log if needed
				if (!isFirstChanLogAsked(msg.chanlist[i])) {
					$scope.askChanLog(msg.chanlist[i]);
				}
			}
		});
	});


	/**
	* Check if it is irc PRIVMSG command
	*/
	var isIrcPrivMsg = function (command) {
		return command[0] != "/";
	};

	/**
	* parse and dispatch command
	*/
	$scope.dispatchCommand = function (command) {
		var cmdArr = command.split(" ");
		switch (cmdArr[0]) {
			case "join":
				$scope.ircJoin(cmdArr[1]);
				break;
			default:
				alert("unsupported command : " + cmdArr[0]);
		}
	};

	/**
	* Send irc command
	*/
	$scope.sendCommand = function () {
		if (isIrcPrivMsg($scope.ircCommand)) {
			$scope.sendMsg($scope.ircCommand);
		} else {
			$scope.dispatchCommand($scope.ircCommand.substr(1));
		}
		$scope.ircCommand = "";
	};

	/**
	* isInChannel will return true if we are in channel, not with other user
	*/
	var isInChannel = function () {
		return ($scope.activeChan[0] == "#");
	};

	//check if we need to show date
	$scope.showDate = function (idx, messages) {
		if (idx === 0) {
			return true;
		}
		var prevDate = new Date(messages[idx-1].timestamp).getDate();
		var curDate = new Date(messages[idx].timestamp).getDate();
		return prevDate != curDate;
	};

	$scope.$on("$routeChangeStart", function (event, next, current) {
		$rootScope.chattab[$scope.activeChan].lastScrollPos = $('#chat').scrollTop();
	});
	initController();

}]);
