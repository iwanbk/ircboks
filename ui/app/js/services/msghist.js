angular.module('msghist', ['comm', 'session'])
.factory('MsgHistService', ['$q', '$rootScope', 'wsock', 'Session', 
	function ($q, $rootScope, wsock, Session) {
	var Service = {
		histdict: {}
	};

	//add msghist for a target
	Service.addTargetHist = function (target) {
		hist = new ChatHist(target);
		this.histdict[target] = hist;
	};

	/**
	* Check if msghist for this target alrady exist.
	* And initialize it if not
	*/
	Service.checkInit = function (target) {
		if (this.histdict[target] === undefined) {
			this.addTargetHist(target);
			this.askUnreadMsg(target);
		}
		if (this.histdict[target].isHistAsked() === false) {
			this.askLog(target);
			this.histdict[target].setHistAsked();
		}
	};

	Service.getChatHist = function (target) {
		if (this.histdict[target] === undefined) {
			this.addTargetHist(target);
		}
		return this.histdict[target];
	};

	Service.askUnreadMsg = function (target) {
		if (target[0] == "#") {
			this._askChanUnreadMsg(target);
		} else {
			this._askNickUnreadMsg(target);
		}
	};
	/**
	* Ask unread message of a channel
	*/
	Service._askChanUnreadMsg = function (chan_name) {
		var msg = {
			event: "msghistUnreadChannel",
			data: {
				userId: Session.userId,
				channel: chan_name
			}
		};
		wsock.send(JSON.stringify(msg));
	};
	/**
	* Ask unread message from a nick
	*/
	Service._askNickUnreadMsg = function (nick) {

	};

	/**
	* target = channel or nick
	* msg = Message object
	*/
	Service.addNewMsg = function (target, msg) {
		if (this.histdict[target] === undefined) {
			this.addTargetHist(target);
		}
		this.histdict[target].appendMsg(msg);
		this.histdict[target].needScrollBottom = true;
	};

	Service.addNewMsgFront = function (target, msg) {
		if (this.histdict[target] === undefined) {
			this.addTargetHist(target);
		}
		this.histdict[target].prependMsg(msg);
		//this.histdict[target].needScrollBottom = true;
	};

	Service.askLog = function (target) {
		if (target[0] == "#") {
			Service.askChanLog(target);
		} else {
			Service.askNickLog(target);
		}
	};
	Service.askNickLog = function (nick) {
		console.log("askNickLog " + nick);
		var msg = {
			event: 'msghistNickReq',
			data: {
				userId: Session.userId,
				sender: nick,
				target: Session.nick
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	//Ask for channel logs/history
	Service.askChanLog = function (channame) {
		console.log("ask chan log = " + channame);
		var msg = {
			event: 'msghistChannel',
			data: {
				userId: Session.userId,
				channel:channame
			}
		};
		wsock.send(JSON.stringify(msg));
	};

	return Service;
}])
;