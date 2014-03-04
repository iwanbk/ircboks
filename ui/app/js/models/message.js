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
		* - readFlag = flag if this message already read. outgoing message will always
		*				has true value
		* - eventType = event of this message (PRIVMSG, JOIN, PART, QUIT, etc)
		* - oid = Object ID of this message
		*/
		function message (msg, timestamp, nick, target, readFlag, eventType, oid) {
			this.message = msg;
			this.timestamp = timestamp * 1000;
			this.nick = nick;
			this.target = target;
			this.readFlag = readFlag;
			this.eventType = eventType;
			this.oid = oid;
		}

		message.prototype.isToChannel = function () {
			return (this.target[0] === "#");
		};

		message.prototype.isRead = function () {
			return this.readFlag;
		};
		return message;
	})();
	window.Message = message;
}).call(this);
