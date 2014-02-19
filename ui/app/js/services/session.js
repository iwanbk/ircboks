angular.module('session', [])
.factory('Session', ['$q', '$rootScope',  function ($q, $rootScope) {
	var Service = {
		targetChannels:[],
		targetNicks:[]
	};

	//check if a channel already in target list
	var isTargetChanExist = function (chan_name) {
		for (i = 0; i < Service.targetChannels.length; i++) {
			var chan = Service.targetChannels[i];
			if (chan.name == chan_name) {
				return true;
			}
		}
		return false;
	};

	//add a target
	Service.addTarget = function (target) {
		if (target[0] == "#") {
			if (!isTargetChanExist(target)) {
				var chan = {
					name:target,
					encName: encodeURIComponent(target)
				};
				this.targetChannels.push(chan);
			}
		} else {
			if (this.targetNicks.indexOf(target) == -1) {
				this.targetNicks.push(target);
			}
		}
	};
	Service.setTargetChannels = function (chanArr) {
		this.targetChannels = [];
		for (var i in chanArr) {
			var chan = {
				name: chanArr[i],
				encName: encodeURIComponent(chanArr[i])
			};
			this.targetChannels.push(chan);
		}
	};

	console.log("Target Service initialized");
	return Service;
}])
;