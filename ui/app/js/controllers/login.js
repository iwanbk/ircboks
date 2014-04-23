ircboksControllers.controller('loginCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session) {

	$scope.server = "irc.freenode.net:6667";

	$scope.loginMsg = "Please Login";
	$scope.loginMsgClass = "alert-info";
	$scope.registrationMsg = "";

	$scope.isNeedStart = false;
	$scope.isLoggingIn = false;//flag that indicate this user in login process.
	$scope.isLogin = false;

	$scope.$on("$routeChangeSuccess", function (event, next, current) {
		if ($scope.isLogin === false && $scope.isLoggingIn === false && wsock.isWsOpen === true) {
			relogin();
		}
	});

	/* logging in when websocket connection opened */
	$scope.$on("wsStatus", function (event, msg) {
		if (msg == "open" && $scope.isLoggingIn === false && $scope.isLogin === false) {
			relogin();
		} else {
			console.log("msg = " + msg + ".isLoggingIn = " + $scope.isLoggingIn + ".isLogin = " + $scope.isLogin);
		}
	});


	/**
	* Try to relogin based on saved auth credentials from local storage
	*/
	var relogin = function () {
		var savedAuth = Session.loadAuth();
		if (savedAuth.valid === true && savedAuth.userId !== null && savedAuth.pass !== null) {
			$scope.userId = savedAuth.userId;
			$scope.userPassword = savedAuth.pass;
			$scope.login();
		}
	};

	//login to ircboks
	$scope.login = function () {
		$scope.isLoggingIn = true;
		var msg = {
			'event': 'login',
			'domain': 'boks',
			'userId': $scope.userId,
			'data': {
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
			domain: 'boks',
			userId: $scope.newUserId,
			data: {
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
			userId: Session.userId,
			domain: 'boks',
			'data': {
				nick: $scope.nick,
				user: $scope.user,
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
			Session.saveAuth($scope.userId, $scope.userPassword);
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
				$rootScope.$broadcast("endpointReady");
			} else {
				Session.isNeedStart = true;
				$scope.isNeedStart = true;
			}
		}
		$scope.isLoggingIn = false;
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
		if (msg.result === true) {
			Session.isNeedStart = false;
			Session.isReady = true;
			$scope.toChatPage();
			$rootScope.$broadcast("endpointReady");
		} else {
			console.error("unhandled event = clientStartResult false");
		}
		$scope.$apply();
	});
}]);

