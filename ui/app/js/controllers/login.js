ircboksControllers.controller('loginCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session) {

	//user details, just for convenience while in early test
	$scope.userId = "paijo@gmail.com";
	$scope.userPassword = "paijo";

	$scope.nick = "paijon";
	$scope.ircPassword = "";
	$scope.user = "paijon";
	$scope.channel = "#ircboks";
	$scope.server = "irc.freenode.net:6667";

	$scope.loginMsg = "Please Login";
	$scope.loginMsgClass = "alert-info";
	$scope.registrationMsg = "";

	$scope.isNeedStart = false;

	//login to ircboks
	$scope.login = function () {
		var msg = {
			'event': 'login',
			'data': {
				'userId': $scope.userId,
				'password': $scope.userPassword
			}
		};
		Session.userId = $scope.userId;
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
				userId: Session.userId,
				nick: $scope.nick,
				user: $scope.user,
				channel: $scope.channel,
				server: $scope.server,
				password: $scope.ircPassword
			}
		};
		$rootScope.channel = $scope.channel;

		Session.nick = $scope.nick;
		Session.user = $scope.user;
		$rootScope.channel = $scope.channel;
		Session.server = $scope.server;

		wsock.send(JSON.stringify(msg));
	};
	
	$scope.$on('loginResult', function (event, msg) {
		if (msg.result === false) {
			$scope.loginMsgClass = "alert-danger";
			$scope.loginMsg = "Login failed : please check your username & password";
			console.error("Login failed");
		} else {
			Session.userId = $scope.userId;
			$scope.loginMsgClass = "alert-success";
			$scope.loginMsg = "Login succeed. Initializing your ircboks";
			Session.isLogin = true;
			$scope.isLogin = true;
			if (msg.ircClientExist === true) {
				Session.nick = msg.nick;
				Session.user = msg.user;
				Session.server = msg.server;

				Session.isReady = true; 

				$scope.toChatPage();
			} else {
				Session.isNeedStart = true;
				$scope.isNeedStart = true;
			}
		}
		$scope.$apply();
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
		var page = "/" + Session.server;
		console.log("redirect to :" + page);
		$location.path(page);
	};

	$scope.$on('clientStartResult', function (event, msg) {
		if (msg.result == "true") {
			Session.isNeedStart = false;
			Session.isReady = true;
			$scope.toChatPage();
		} else {
			console.error("unhandled event = clientStartResult false");
		}
		$scope.$apply();
	});
}]);

