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

		MsgHistService.addNewMsg(target, log);
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
