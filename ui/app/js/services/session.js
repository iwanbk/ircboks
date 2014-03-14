angular.module('session', ['comm'])
.factory('Session', ['$q', '$rootScope', 'wsock', function ($q, $rootScope, wsock) {
	var Service = {
		userId: null,
		nick: null,
		ircUser: null,
		server: null,

		//state
		isLogin: false,
		isReady: false,
		isNeedStart: false,
		isKilled: false,

		chathist: {}, //chat history
		memberdict: {}, //dictionary of channel members
		targetChannels:[],//target channels array
		targetNicks:[] //target nicks array
	};

	/**
	* init  members object of a channel if still undefined
	*/
	Service.checkInitMember = function (channel) {
		if (this.memberdict[channel] === undefined) {
			console.log("Session.checkInitMember " + channel);
			this.memberdict[channel] = new Members(channel);
			this.askChannelNames(channel);
		}
	};

	//addMember add nick as a member of a channel
	Service.addMember = function (nick, channel) {
		this.checkInitMember(channel);
		this.memberdict[channel].addNick(nick);
	};

	//delMember del nick from a channel
	Service.delMember = function (nick, channel) {
		if (this.memberdict[channel] !== undefined) {
			this.memberdict[channel].delNick(nick);
		}
	};

	/**
	* Del nick from member of all joined channel.
	*/
	Service.delMemberFromAll = function (nick) {
		for (var channel in this.memberdict) {
			if (channel[0] != "#") {
				return;
			}
			this.delMember(nick, channel);
		}
	};

	/**
	* add member array to memberlist of a channel
	*/
	Service.addMemberArr = function (nickArr, channel) {
		this.checkInitMember(channel);
		this.memberdict[channel].add(nickArr, false);
	};

	/**
	* send NAMES command for a channel
	*/
	Service.askChannelNames = function (channel) {
		if (channel[0] != "#") {
			return;
		}
		var msg = {
			event:"ircNames",
			userId: this.userId,
			domain: 'irc',
			data: {
				channel: channel
			}
		};
		wsock.send(JSON.stringify(msg));
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

	/**
	* kill our IRC client
	*/
	Service.killMe = function () {
		var msg = {
			event: 'killMe',
			domain: 'boks',
			userId: this.userId
		};
		wsock.send(JSON.stringify(msg));
	};

	Service.askNicksUnread = function () {
		var msg = {
			event : "msghistNicksUnread",
			domain: "boks",
			userId: this.userId
		};
		wsock.send(JSON.stringify(msg));
	};
	$rootScope.$on("endpointReady", function () {
		console.log("endpointReady");
		Service.askNicksUnread();
	});

	$rootScope.$on("ircClientDestroyed", function () {
		Service.isLogin = false;
		Service.isReady = false;
		Service.isNeedStart = false;
	});
	return Service;
}])
;