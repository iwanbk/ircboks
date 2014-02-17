/**
 * Channel members
 */
(function() {
	var members;
	members = (function() {
		function members (channel) {
			var root = this;
			this.names = [];
			this.channel = channel;
		}

		/**
		* Add list of members
		*/
		members.prototype.add = function (strList, isEnd) {
			if (isEnd) {
				return;
			}
			var namesArr = strList.split(" ");
			for (var i in namesArr) {
				if (this.names.indexOf(namesArr[i]) == -1) {
					this.names.push(namesArr[i]);
				}
			}
		};
		members.prototype.addNick = function (nick) {
			if (this.names.indexOf(nick) < 0) {
				this.names.push(nick);
			}
		};
		members.prototype.delNick = function (nick) {
			var idx = this.names.indexOf(nick);
			if (idx >= 0) {
				this.names.splice(idx, 1);
			}
		};

		return members;
	})();
	window.Members = members;
}).call(this);
