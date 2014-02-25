ircboksControllers.controller('statusCtrl', ['$scope', '$rootScope', '$routeParams',  '$location', 'wsock', 'Session',
	function ($scope, $rootScope, $routeParams, $location, wsock, Session) {

	$scope.activeServer = $routeParams.activeServer;
	$scope.activeChan = $routeParams.activeChan;
	$scope.session = Session;
	$scope.wsStr = "Connecting..";
	if ($scope.activeChan === undefined) {//temporary hack for our status page
		$scope.activeChan = $scope.activeServer;
	}

	$scope.$on("wsStatus", function (event, msg) {
		switch (msg) {
			case "connecting":
				$scope.wsStr = "Connecting.";
				break;
			case "open":
				$scope.wsStr = "Connected.";
				break;
			case "close":
				$scope.wsStr = "Closed.";
				break;
			case "error":
				$scope.wsStr = "Error.";
				break;
		}
		$scope.$apply();
	});
}]);
