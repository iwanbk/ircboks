ircboksControllers.controller('commandCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session', 'MsgHistService',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session, MsgHistService) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;
	if ($scope.activeChan === undefined) {//temporary hack for our status page
		$scope.activeChan = $scope.activeServer;
	}

	//send PRIVMSG
	$scope.sendPrivMsg = function (target, message) {
		var msg = {
			event: 'ircPrivMsg',
			userId: Session.userId,
			domain: 'irc',
			data: {
				target: target,
				message: message
			}
		};
		wsock.send(JSON.stringify(msg));

		var timestamp = new Date().getTime();
		var msgObj = new Message(message, timestamp / 1000, Session.nick, target, true, "PRIVMSG");

		MsgHistService.addNewMsg(target, msgObj);
	};

	$scope.ircJoin = function (channel) {
		var msg = {
			event: 'ircJoin',
			userId: Session.userId,
			domain: 'irc',
			data: {
				channel: channel
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	/**
	* Send PART command
	*/
	var part = function (cmd, cmdArr) {
		var args = [cmdArr[1]];
		var msg = {
			event: "part",
			userId: Session.userId,
			domain: 'irc',
			args: args
		};
		wsock.send(JSON.stringify(msg));
	};

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
			case "part":
				part(command, cmdArr);
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
		console.log("irc com = " + $scope.ircCommand);
		if (isIrcPrivMsg($scope.ircCommand)) {
			$scope.sendPrivMsg($scope.activeChan, $scope.ircCommand);
		} else {
			$scope.dispatchCommand($scope.ircCommand.substr(1));
		}
		$scope.ircCommand = "";
	};


}]);
