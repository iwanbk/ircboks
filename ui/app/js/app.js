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
		when('/:activeServer/:activeChan', {
			templateUrl: 'partials/chat.html',
			controller: 'mainCtrl'
		});
}]);