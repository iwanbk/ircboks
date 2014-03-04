/**
 * Chat History
 */
(function() {
	var chathist;
	chathist = (function() {
		/**
		* Create new chat history object
		* - target = message target (channel or nick)
		*/
		function chathist (target) {
			this.target = target;
			//number of unread message
			this.unreadCount = 0;
			//messages array
			this.messages = [];

			//true if history of this channel already asked
			this.histAsked = false;

			//true if there is new message and need to scroll down the scrollbar 
			this.needScrollBottom = false;

		}

		/**
		* isChanHist will return true if it is channel history.
		* return false if it is nick history
		*/
		chathist.prototype.isChanHist = function () {
			return (this.target[0] === "#");
		};

		chathist.prototype.appendMsg = function (msg) {
			this.messages.push(msg);
			if (msg.readFlag === false) {
				this.unreadCount++;
			}
		};

		chathist.prototype.prependMsg = function (msg) {
			this.messages.unshift(msg);
			if (msg.readFlag === false) {
				this.unreadCount++;
			}
		};

		chathist.prototype.isHistAsked = function () {
			return this.histAsked;
		};

		chathist.prototype.setHistAsked = function () {
			this.histAsked = true;
		};

		/**
		* get array of oid of unread messages
		*/
		chathist.prototype.getUnreadOidArr = function () {
			var oidArr = [];
			for (i = 0; i < this.messages.length; i++) {
				var msg = this.messages[i];
				if (!msg.isRead()) {
					oidArr.push(msg.oid);
				}
			}
			return oidArr;
		};
		/**
		* Set messages with oid in oidArr as read
		*/
		chathist.prototype.setReadOidArr = function (oidArr) {
			for (var i = 0; i < oidArr.length; i++) {
				var msg = this.getMessageByOid(oidArr[i]);
				if (msg !== null) {
					msg.readFlag = true;
					this.unreadCount -= 1;
				}
			}
		};

		chathist.prototype.getMessageByOid = function (oid) {
			for (i = 0; i < this.messages.length; i++) {
				if (this.messages[i].oid == oid) {
					return this.messages[i];
				}
			}
			return null;
		};

		return chathist;
	})();
	window.ChatHist = chathist;
}).call(this);
