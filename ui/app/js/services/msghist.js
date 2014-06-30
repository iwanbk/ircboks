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
		//convert oid type to string because args expect array of string
		for (i=0; i < oidArr.length; i++) {
			oidArr[i] = oidArr[i].toString();
		}
		var msg = {
			event: 'msghistMarkRead',
			userId: Session.userId,
			domain: 'boks',
			args: oidArr
		};
		wsock.send(JSON.stringify(msg));
		this.histdict[target].setReadOidArr(oidArr);
	};

	Service.markAsRead = function (target, oid) {
		var oidArr = [oid.toString()];
		var msg = {
			event: 'msghistMarkRead',
			userId: Session.userId,
			domain: 'boks',
			args: oidArr
		};
		wsock.send(JSON.stringify(msg));
		this.histdict[target].setReadOidArr(oidArr);
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
			userId: Session.userId,
			domain: 'boks',
			data: {
				nick: nick
			}
		};
		wsock.send(JSON.stringify(msg));
		this.histdict[nick].setHistAsked();
	};

	//Ask for channel logs/history
	Service.askChanLog = function (channame) {
		console.log("ask chan log = " + channame);
		var msg = {
			event: 'msghistChannel',
			userId: Session.userId,
			domain: 'boks',
			data: {
				channel:channame
			}
		};
		wsock.send(JSON.stringify(msg));
		this.histdict[channame].setHistAsked();
	};

	$rootScope.$on("msghistNicksUnread", function (event, msg) {
		if (msg.nicks === undefined || msg.nicks === null) {
			return;
		}
		for (var i = 0; i < msg.nicks.length; i++) {
			Service.checkInit(msg.nicks[i]);
		}
	});

	return Service;
}])
;