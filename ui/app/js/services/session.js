angular.module('session', [])
.factory('Session', ['$q', '$rootScope',  function ($q, $rootScope) {
	var Service = {
		userId: null,
		nick: null,
		ircUser: null,
		server: null,

		//state
		isLogin: false,
		isReady: false,
		isNeedStart: false,

		chathist: {}, //chat history
		memberdict: {}, //dictionary of channel members
		targetChannels:[],//target channels array
		targetNicks:[] //target nicks array
	};

	Service.initMember = function (channel) {
		if (this.memberdict[channel] === undefined) {
			this.memberdict[channel] = new Members(channel);
		}
	};
	//addMember add nick as a member of a channel
	Service.addMember = function (nick, channel) {
		if (this.memberdict[channel] === undefined) {
			this.memberdict[channel] = new Members(channel);
		}
		this.memberdict[channel].addNick(nick);
	};

	//delMember del nick from a channel
	Service.delMember = function (nick, channel) {
		if (this.memberdict[channel] !== undefined) {
			this.memberdict[channel].delNick(nick);
		}
	};

	Service.delMemberFromAll = function (nick) {
		for (var channel in this.memberdict) {
			if (channel[0] != "#") {
				return;
			}
			this.delMember(nick, channel);
		}
	};

	Service.addMemberArr = function (nickArr, channel) {
		if (this.memberdict[channel] === undefined) {
			this.memberdict[channel] = new Members(channel);
		}
		this.memberdict[channel].add(nickArr, false);
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