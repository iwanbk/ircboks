var ircboksApp = angular.module('ircboksApp', [
	'ngRoute',
	'ircboksControllers'
]);

ircboksApp.config(['$routeProvider', function ($routeProvider) {
	$routeProvider.

		when('/', {
			templateUrl: 'partials/front.html',
			controller: 'loginCtrl'
		}).
		when('/:activeServer', {//server status page
			templateUrl: 'partials/nickchat.html'
		}).
		when('/:activeServer/c/:activeChan', {//channel chat page
			templateUrl: 'partials/chat.html'
		}).
		when('/:activeServer/:activeChan', {//nick chat page
			templateUrl: 'partials/nickchat.html'
		});
}]);