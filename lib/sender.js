var nodemailer = require("nodemailer");
const NoTransport = require('errno').create('Mailers');

var Sender = function(transports) {
	this.transports = null;
	if(transports) this._createTransports(transports);
};

nodemailer.X_MAILER_NAME = "";
nodemailer.X_MAILER_HOMEPAGE = "";


module.exports = exports = function() {

	//called directly
	return new Sender();
};

//hack for use farm-worker (cluster)
var sender;
exports.SendMailWithCluster = function(options, transports, cb) {
	if(!sender) sender = new Sender();
	sender.sendMail(options, transports, cb);
}



Sender.prototype.sendMail = function(options, transports, cb) {
	if(!cb) {
		cb = transports;
		transports = null;
	}
	if(!this.transports) this._createTransports(transports);
	this._nextTransport().sendMail(options, cb);
};


Sender.prototype._createTransports = function(transports) {
	this.transports = (transports || []).map(function(transport){
		var type = resolveTransport(transport.type);
		return nodemailer.createTransport(type, transport.options);
	});
};


Sender.prototype._nextTransport = function() {
    var current = this.transports.shift();
    if(!current) return noTransport();

    this.transports.push(current);
    return current;
};

/* --------------- PRIVATE FUNCTIONS ------------------------- */


function noTransport() {
	return {
		sendMail: function(options, cb) {
			cb(NoTransport("There are no transports"));
		}
	};
}



function resolveTransport(type) {
	var path = __dirname + "/transports/" + type + "/" + type;
	try {
		return require(path);
	} catch(e) {if(e.toString().indexOf(path) == -1) throw e; }

	return type;
}