/**
 * Channel Message
 */
(function() {
	var message;
	message = (function() {
		/**
		* Create new message
		* - message = message content
		* - timestamp = timestamp when this message received by the server
		* - nick = sender nick
		* - target = message target
		* - eventType = event of this message (PRIVMSG, JOIN, PART, QUIT, etc)
		*/
		function message (msg, timestamp, nick, target, eventType) {
			this.message = msg;
			this.timestamp = timestamp * 1000;
			this.nick = nick;
			this.target = target;
			this.eventType = eventType;
		}

		message.prototype.isToChannel = function () {
			return (this.target[0] === "#");
		};
		return message;
	})();
	window.Message = message;
}).call(this);
