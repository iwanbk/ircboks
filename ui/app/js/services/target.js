/**
* Manage all target channels & nicks.
* This service will replace all target related services in Session service.
*/
angular.module('targetServices', ['ircServices'])
.factory('Target', ['$rootScope', 'ircCommand',  function ($rootScope, ircCommand) {
	var Service = {
		targetChannels:[],//target channels array
		targetNicks:[] //target nicks array
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

	//check if a channel already in target list
	var getTargetChannelIdx = function (chan_name) {
		for (i = 0; i < Service.targetChannels.length; i++) {
			var chan = Service.targetChannels[i];
			if (chan.name == chan_name) {
				return i;
			}
		}
		return -1;
	};

	/**
	* Add a target to target list.
	* Target could be a channel or a nick
	*/
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

	/**
	* Remove a channel from targetChannels list
	*/
	Service.delTargetChannel = function (channel) {
		var idx = this.targetChannels.indexOf(channel);
		if (idx > 0) {
			this.targetChannels.splice(idx, 1);
		}
	};

	/**
	* Set targetChannels value to given channel array
	*/
	Service.setTargetChannels = function (chanArr) {
		this.targetChannels = [];
		for (var i in chanArr) {
			var chan = {
				name: chanArr[i],
				topic: '',
				encName: encodeURIComponent(chanArr[i])
			};
			this.targetChannels.push(chan);
			ircCommand.topicGet(chan.name);
		}
	};

	/**
	* Set topic of a channel.
	*/
	Service.setChannelTopic = function (channel, topic) {
		var idx = getTargetChannelIdx(channel);
		if (idx >= 0) {
			this.targetChannels[idx].topic = topic;
		}
	};

	/**
	* get topic of a channel.
	*/
	Service.getChannelTopic = function (channel) {
		if (channel === undefined || channel[0] != '#') {
			return "";
		}
		var idx = getTargetChannelIdx(channel);
		if (idx >= 0) {
			return this.targetChannels[idx].topic;
		}
		return "";
	};

	return Service;
}])
;