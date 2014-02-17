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

