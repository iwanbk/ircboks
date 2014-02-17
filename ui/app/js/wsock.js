angular.module('comm', [])
.factory('wsock', ['$q', '$rootScope',  function ($q, $rootScope) {
	var Service = {};
	var ws;
	var isWsOpen = false;
	
	Service.connect = function (url) {
		ws = new WebSocket(url);
		
		ws.onopen = function () {
			console.log("ws conn opened");
			isWsOpen = true;
		};

		ws.onclose = function () {
			console.log("ws conn closed");
			isWsOpen = false;
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
		if (isWsOpen) {
			ws.send(msg);
		} else {
			console.error("[wsock] drop message = " + msg);
		}
	};

	Service.connect("ws://localhost:3000/irc/");
	return Service;
}])
;