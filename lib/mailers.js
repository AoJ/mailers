var _ = require("lodash");
var events = require("events");
var util = require('util');
var queue = require("async").queue;
var callqueue = require("callqueue");
var senderPath = require.resolve("./sender.js");



var Mailer = function(transports) {

	this.transports = transports;

	var farmOptions = {
		timeout: 120 * 1000, 
		workers: require('os').cpus().length,
		parallelPerWork: _.max(_.pluck(transports, "maxConnections").concat(10))
	};

	this.sender = callqueue(senderPath, ["SendMailWithCluster"], farmOptions);

	//create worker
	var concurrency = farmOptions.workers * farmOptions.parallelPerWork;
	this.queue = queue(function(options, cb) { this._worker(options, cb); }.bind(this), concurrency);

	//event is called when the last item from the queue has returned from the worker
	this.queue.drain = this.emit.bind(this, "drain");

	//event is called when the last item from the queue is given to a worker.
	this.queue.empty = this.emit.bind(this, "empty");

	//event is called when the queue length hits the concurrency limit, and further tasks will be queued.
	this.queue.saturated = this.emit.bind(this, "saturated");

	//kill workers when no another task
	this.on("drain", this.sender.stop.bind(this.sender));

	setTimeout(this.sender.usage.bin(this.sender), 1000);
}
util.inherits(Mailer, events.EventEmitter);


Mailer.prototype.sendMail = function(options, cb) {
	this.queue.push(options, function(err){
		delete options.transport; //security
		cb(err, options);
	});
}


/**
 * send email now with high priority - error message etc.
 *
 */
Mailer.prototype.sendMailImmediately = function(options, cb) {
	this.queue.unshift(options, function(err){
		cb(err, options);
	});
}

Mailer.prototype.pause = function() {
	this.queue.pause();
	this.emit("paused");
}

Mailer.prototype.resume = function() {
	this.queue.resume();
	this.emit("resumed");
}

Mailer.prototype.kill = function() {
	this.queue.kill();
	this.emit("killed");
}
/**
 * @return {Bool}
 */
Mailer.prototype.isPaused = function() {
	return this.queue.paused;
}

/**
 * get concurrency
 * @param {Number} newValue
 * @return {Number}
 */
Mailer.prototype.concurrency = function() {
	return this.queue.concurrency;
}

/**
 * returning the number of items waiting to be processed.
 * @return {Number}
 */
Mailer.prototype.remain = function() {
	return this.queue.length();
}

/**
 * returning the number of items currently being processed.
 * @return {Number}
 */
Mailer.prototype.now = function() {
	return this.queue.running();
}


Mailer.prototype._worker = function(options, callback) {
	return this.sender.run.SendMailWithCluster(options, this.transports, function(err, result){
		if(!err) options.result = result;
		callback(err);
	});
}

/* ------------------ PUBLIC METHODS ------------------------- */

exports.create = function(transport, options) {
	var transports = _.isArray(transport) ? transport : [{type: transport, options: options}];
	return new Mailer(transports);
}