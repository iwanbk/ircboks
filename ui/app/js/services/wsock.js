angular.module('comm', [])
.factory('wsock', ['$rootScope', function ($rootScope) {
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
			//console.log("[wsock]onmessage = " + msg.data);
			$rootScope.$broadcast('wsockMsg', msg.data);
		};

		ws.onerror = function () {
			$rootScope.$broadcast("wsStatus", "close");
		};
	};

	$rootScope.$on('wsockMsg', function (event, msg) {
		var data = JSON.parse(msg);
		//TODO : check event
		$rootScope.$broadcast(data.event, data.data);
	});

	Service.send = function (msg) {
		//check ws
		if (Service.isWsOpen) {
			console.log("sending message = " + msg);
			ws.send(msg);
		} else {
			console.log("[wsock] drop message = " + msg);
		}
	};

	/**
	* Send IRCBoks command to IRCBoks server.
	*/
	Service.sendCommand = function (command) {
		this.send(JSON.stringify(command));
	} ;

	Service.connect("ws://"+window.location.host+"/irc/");
	return Service;
}])
;