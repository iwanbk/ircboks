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
		}
		if (this.histdict[target].isHistAsked() === false) {
			this.askChatHist(target);
			this.histdict[target].setHistAsked();
		}
	};

	/**
	* get ChatHist object of a target
	*/
	Service.getChatHist = function (target) {
		if (this.histdict[target] === undefined) {
			this.addTargetHist(target);
		}
		return this.histdict[target];
	};

	/**
	* Mark all messages as read
	*/
	Service.markAllAsRead = function (target) {
		var oidArr = this.histdict[target].getUnreadOidArr();
		if (oidArr.length === 0) {
			return;
		}
		var msg = {
			event: 'markMsgRead',
			data: {
				userId: Session.userId,
				oids: oidArr
			}
		};
		this.histdict[target].unreadCount = 0;
		wsock.send(JSON.stringify(msg));
	};

	Service.markAsRead = function (oid) {
		var oidArr = [oid];
		var msg = {
			event: 'markMsgRead',
			data: {
				userId: Session.userId,
				oids: oidArr
			}
		};
		wsock.send(JSON.stringify(msg));
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
	};

	Service.askChatHist = function (target) {
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