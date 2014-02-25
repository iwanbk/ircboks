angular.module('comm', [])
.factory('wsock', ['$q', '$rootScope',  function ($q, $rootScope) {
	var Service = {
		isWsOpen: false
	};
	var ws;
	
	Service.connect = function (url) {
		$rootScope.$broadcast("wsStatus", "connecting");
		ws = new WebSocket(url);
		
		ws.onopen = function () {
			Service.isWsOpen = true;
			$rootScope.$broadcast("wsStatus", "open");
		};

		ws.onclose = function () {
			Service.isWsOpen = false;
			$rootScope.$broadcast("wsStatus", "close");
		};

		ws.onmessage = function (msg) {
			$rootScope.$broadcast('wsockMsg', msg.data);
		};

		ws.onerror = function () {
			$rootScope.$broadcast("wsStatus", "close");
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
		if (Service.isWsOpen) {
			ws.send(msg);
		} else {
			console.log("[wsock] drop message = " + msg);
		}
	};

	Service.connect("ws://"+window.location.host+":3000/irc/");
	return Service;
}])
;