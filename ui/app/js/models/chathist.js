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
		}

		/**
		* isChanHist will return true if it is channel history.
		* return false if it is nick history
		*/
		chathist.prototype.isChanHist = function () {
			return (this.target[0] === "#");
		};

		chathist.prototype.addMsg = function (msg) {
			this.messages.push(msg);
		};

		return chathist;
	})();
	window.ChatHist = chathist;
}).call(this);
