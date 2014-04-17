var mandrill = require("mandrill-api/mandrill");
const MandrillError = require("errno").create("MandrillApi");



function MandrillTransport(options) {
	this.options = options || {};
	if(!this.options.key) this.options.key = process.env.MANDRILL_KEY;
	this.mandrill = new mandrill.Mandrill(this.options.key);
}
module.exports = MandrillTransport;

MandrillTransport.prototype.sendMail = function (emailMessage, cb) {
	if(!this.options.key) return cb(new MandrillError("require options.key for mandrill api"));
	this.sendRequest(emailMessage, function (err, result) {
		if (err) return cb(err);

		//todo messageId
		return cb(null, result);
	})

};


MandrillTransport.prototype.sendRequest = function (emailMessage, cb) {
	this.generateMessage(emailMessage, function (err, html) {
		var options = {
			raw_message: html, 
			async: false, 
			ip_pool: "nemáme žádný pool",
		};
		var success = function(result) {
			result.messageId = emailMessage._messageId;
			cb(null, result);
		}
		var error = function(err) {
			var e = new MandrillError(err.message);
			e.code = err.code;
			e.response = err;
			cb(e);
		}

		this.mandrill.messages.sendRaw(options, success, error);
	}.bind(this));
};

/**
 * * Compiles the messagecomposer object to a string.
 *
 * * It really sucks but I don"t know a good way to stream a POST request with
 * unknown legth, so the message needs to be fully composed as a string.
 *
 * @param {Object} emailMessage MailComposer object
 * @param {Function} callback Callback function to run once the message has been compiled
 */
MandrillTransport.prototype.generateMessage = function (emailMessage, callback) {
	var email = "";

	emailMessage.on("data", function (chunk) {
		email += (chunk || "").toString("utf-8");
	});

	emailMessage.on("end", function (chunk) {
		email += (chunk || "").toString("utf-8");
		callback(null, email);
	});

	emailMessage.streamMessage();
};