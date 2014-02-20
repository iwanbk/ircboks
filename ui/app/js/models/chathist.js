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
		};

		chathist.prototype.prependMsg = function (msg) {
			this.messages.unshift(msg);
		};

		chathist.prototype.isHistAsked = function () {
			return this.histAsked;
		};

		chathist.prototype.setHistAsked = function () {
			this.histAsked = true;
		};

		return chathist;
	})();
	window.ChatHist = chathist;
}).call(this);
