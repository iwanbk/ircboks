'use strict';

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
		when('/:activeServer/c/:activeChan', {
			templateUrl: 'partials/chat.html'
		}).
		when('/:activeServer/:activeChan', {
			templateUrl: 'partials/nickchat.html'
		});
}]);