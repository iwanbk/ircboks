angular.module('comm', [])
.factory('wsock', ['$q', '$rootScope',  function ($q, $rootScope) {
	var Service = {};
	var ws;
	
	Service.hello = function () {
		console.log("hello wsock");
	};

	Service.connect = function (url) {
		ws = new WebSocket(url);
		
		ws.onopen = function () {
			console.log("ws conn opened");
		};

		ws.onclose = function () {
			console.log("ws conn closed");
		};

		ws.onmessage = function (msg) {
			$rootScope.$broadcast('wsockMsg', msg.data);
		};
	};

	$rootScope.$on('wsockMsg', function (event, msg) {
		console.log('wsockMsg = ' + msg);
		var data = JSON.parse(msg);
		//TODO : check event
		$rootScope.$broadcast(data.event, data.data);
	});

	Service.send = function (msg) {
		//check ws
		ws.send(msg);
	};

	Service.connect("ws://localhost:3000/irc/");
	return Service;
}])
;