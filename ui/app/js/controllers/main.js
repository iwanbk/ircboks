ircboksControllers.controller('mainCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session',
	function ($scope, $rootScope, $routeParams, $location, wsock,Session) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;
	if ($scope.activeChan === undefined) {//temporary hack for our status page
		$scope.activeChan = $scope.activeServer;
	}

	var initController = function () {
		//check if we already login
		if (Session.isLogin === false) {//check if we already login
			if(!$scope.$$phase) {
				$scope.$apply(function(){
					$location.path("/");
				});
			} else {
				$location.path("/");
			}
			return;
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
				userId: Session.userId,
				sender: nick,
				target: Session.nick
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
				userId: Session.userId,
				channel:channame
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//send PRIVMSG
	$scope.sendPrivMsg = function (target, message) {
		var msg = {
			event: 'ircPrivMsg',
			data: {
				userId: Session.userId,
				target: target,
				message: message
			}
		};
		wsock.send(JSON.stringify(msg));

		var timestamp = new Date().getTime();
		var log = {
			message: msg.data.message,
			timestamp: timestamp,
			nick: Session.nick,
			target: msg.data.target
		};

		$rootScope.chattab[target].messages.push(log);
		$rootScope.chattab[target].needScrollBottom = true;
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
			var message = new Message(obj.Message, obj.Timestamp, obj.Nick, obj.Target, "PRIVMSG");
			$rootScope.chattab[message.nick].messages.unshift(message);
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
			var message = new Message(obj.Message, obj.Timestamp, obj.Nick, obj.Target, "PRIVMSG");
			$rootScope.chattab[msg.channel].messages.unshift(message);
		}
		$scope.$apply();
	});


	/**
	* PRIVMSG handler
	*/
	$scope.$on('ircPrivMsg', function (event, msg) {
		var tabName = "";

		var msgObj = new Message(msg.message, msg.timestamp, msg.nick, msg.target, "PRIVMSG");

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
		$scope.$apply();
	});

	$scope.ircJoin = function (channel) {
		var msg = {
			event: 'ircJoin',
			data: {
				userId: Session.userId,
				channel: channel
			}
		};
		wsock.send(JSON.stringify(msg));
	};

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
			case "msg":
				sendMsg(command);
				break;
			default:
				alert("unsupported command : " + cmdArr[0]);
		}
	};
	function sendMsg(command) {
		var cmdArr = command.split(" ");
		if (cmdArr.length < 3) {
			return;
		}
		//message position
		var pos = command.indexOf(cmdArr[2]);
		msg =  $.trim(command.substr(pos));
		$scope.sendPrivMsg(cmdArr[1], msg);
	}

	/**
	* Send irc command
	*/
	$scope.sendCommand = function () {
		if (isIrcPrivMsg($scope.ircCommand)) {
			$scope.sendPrivMsg($scope.activeChan, $scope.ircCommand);
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

	var addToStatusPage = function (msg, eventType) {
		var timestamp;
		if (msg.timestamp === undefined) {
			timestamp = new Date().getTime();
		} else {
			timestamp = msg.timestamp * timestamp;
		}
		var msgObj = new Message(msg.message, timestamp, msg.nick, msg.target, eventType);
		$rootScope.chattab[$scope.activeServer].messages.push(msgObj);
	};
	//handler when we connected to an irc server
	$scope.$on('001', function (event, msg) {
		if ($scope.channel !== undefined && $scope.channel[0] == "#") {
			$scope.ircJoin($scope.channel);
		}
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
}]);
