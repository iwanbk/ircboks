/**
* Session service.
*/
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

	//check if we are already logged in
	Service.isLoggedIn = function () {
		return this.isLogin !== undefined && this.isLogin !== false;
	};

	/**
	* init  members object of a channel if still undefined
	*/
	Service.checkInitMember = function (channel) {
		if (this.memberdict[channel] === undefined) {
			console.log("Session.checkInitMember. initializing " + channel);
			this.memberdict[channel] = new Members(channel);
			this.askChannelNames(channel);
		}
	};

	/**
	* Destroy members object of a given channel
	*/
	Service.destroyMembers = function (channel) {
		if (this.memberdict[channel] !== undefined) {
			delete this.memberdict[channel];
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
			return this.memberdict[channel].delNick(nick);
		}
		return false;
	};

	/**
	* Del nick from member of all joined channel.
	* return list of channel that is joined by this nick.
	*/
	Service.delMemberFromAll = function (nick) {
		var chan_joined = [];
		for (var channel in this.memberdict) {
			if (channel[0] != "#") {
				continue;
			}
			if (this.delMember(nick, channel) === true) {
				chan_joined.push(channel);
			}
		}
		return chan_joined;
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
			event:"names",
			userId: this.userId,
			domain: 'irc',
			data: {
				channel: channel
			}
		};
		wsock.send(JSON.stringify(msg));
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

	/* auth expiration in minutes */
	var AUTH_EXPIRATION_MIN = 120;

	/* save auth details to local storage */
	Service.saveAuth = function (userId, pass) {
		var expMs = AUTH_EXPIRATION_MIN * 60 * 1000;
		var record = {
			userId: userId,
			pass: pass,
			expired: new Date().getTime() + expMs
		};
		localStorage.setItem("ircbokscred", JSON.stringify(record));
	};

	/* load auth details from local storage */
	Service.loadAuth = function () {
		var record = JSON.parse(localStorage.getItem("ircbokscred"));
		if (!record) {
			return {
				valid:false,
			};
		}
		return {
			valid: new Date().getTime() < record.expired,
			userId: record.userId,
			pass: record.pass
		};
	};


	return Service;
}])
;