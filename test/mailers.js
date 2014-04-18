var mailers = require('../lib/mailers');
var assert = require("assert");
var simplesmtp = require('simplesmtp');
var _ = require("lodash");

describe('mailer', function(){
	this.timeout(10000);


	it('should work with stub', function(done){

		var mailer = mailers.create("stub");

		var message = {
			from:    "info@example.com",
			to:      "aoj@n13.cz",
			subject: "hello",
			text:    "world"
		};

		var events = {
			drain: false,
			empty: false
		};

		mailer.on("drain", function() { events.drain = true; })
		mailer.on("empty", function() { events.empty = true; })

		mailer.sendMail(message, function(err, response){
			assert.equal(err, null);
			assert.equal(response.result.envelope.from, "info@example.com");
			assert.equal(response.result.message.length > 10, true);

			setTimeout(function() {
				assert.equal(events.drain, true, "drain event haven't fired");
				assert.equal(events.empty, true, "empty event haven't fired");
				done();

			}, 0)

		})
	})

	it('should work with concurrency', function(done){

		var mailer = mailers.create("smtp", {"host": "localhost", "port": 25000, "name": "a", "maxConnections": 10});

		var smtp = simplesmtp.createServer({disableDNSValidation: true});
		smtp.listen(25000);

		smtp.on("dataReady", function(connection, callback){
			setTimeout(function(){

		    	callback(null, "ABC1");
				//callback(new Error("Rejected as spam!"));
			}, 100);
		});

		var message = {
			from:    "info@n13.cz",
			to:      "aoj@n13.cz",
			subject: "hello",
			text:    "world"
		};


		var events = {
			saturated: false
		};


		mailer.on("saturated", function() { events.saturated = true; })

		var count = 100;

		for(var a = 0; a < count; a++) {
			mailer.sendMail(_.clone(message), function(err, response) {
				count--;
				assert.equal(err, null, err);
				assert.equal(response.result.message, "250 2.0.0 Ok: queued as ABC1");
			});
		}

		mailer.pause();
		assert.equal(mailer.isPaused(), true);
		mailer.resume();
		var immediatelySend = false;

		setTimeout(function(){
			assert.equal(mailer.now(), mailer.concurrency(), "number of sending emails should be same as concurrency");
			assert.equal(mailer.remain(), count - mailer.now());

			mailer.sendMailImmediately(_.clone(message), function(err, response) {
				assert.equal(err, null);
				assert.equal(response.result.message, "250 2.0.0 Ok: queued as ABC1");
				immediatelySend = count;
			})

			setTimeout(function() {
			}, 1000);
		}, 50);

		mailer.on("drain", function() {
			assert.equal(immediatelySend < 80, true, "immediatelySend should be send the first");
			assert.equal(events.saturated, true, "saturated event haven't fired");
			assert.equal(count, 0, "all emails should be send");
			done();
			smtp.end(function() {});
		})

	})


	it('should correct work with errors', function(done){

		var mailer = mailers.create("smtp", {"host": "localhost", "port": 25001, "name": "a", "maxConnections": 10});

		var smtp = simplesmtp.createServer({disableDNSValidation: true});
		smtp.listen(25001);

		smtp.on("dataReady", function(connection, callback){
			callback(new Error("Rejected as spam!"));
		});

		var message = {
			from:    "info@n13.cz",
			to:      "aoj@n13.cz",
			subject: "hello",
			text:    "world"
		};

		mailer.sendMail(message, function(err, response) {
			assert.equal(err.toString(), "Message delivery failed: 550 Rejected as spam!");
			done();
			smtp.end(function() {});
		})

	})


	it('should correct work with more transports', function(done){

		var transports = [
			{name: "smtp", options: {"host": "localhost", "port": 25002, "name": "a2", "maxConnections": 1}},
			{name: "smtp", options: {"host": "localhost", "port": 25003, "name": "a3", "maxConnections": 1}},
			{name: "smtp", options: {"host": "localhost", "port": 25004, "name": "a4", "maxConnections": 1}}
		];
		var mailer = mailers.create(transports);

		var smtps = [];
		transports.forEach(function(transport){
			var smtp = simplesmtp.createServer({disableDNSValidation: true});
			smtp.listen(transport.options.port);
			smtp.on("dataReady", function(connection, callback){
				setTimeout(function() {
					callback(null, "ABC1");
				}, 100);
			});
			smtps.push(smtp);
		});

		var message = {
			from:    "info@n13.cz",
			to:      "aoj@n13.cz",
			subject: "hello",
			text:    "world"
		};

		var result = {};
		var count = 0;

		transports.forEach(function(transport){
			_.range(require('os').cpus().length).forEach(function(i){
				mailer.sendMail(_.clone(message), function(err, response) {
					result[transport.options.name+"-"+i] = response;
					count++;
				})
			})
		});

		mailer.on("drain", function(){
			transports.forEach(function(transport, a){
				_.range(require('os').cpus().length).forEach(function(i){
					assert.equal(result[transport.options.name+"-"+i].result.message, "Message Queued");
				})
				smtps[a].end(function() {});
			});
			assert.equal(count, require('os').cpus().length * transports.length);
			done();
		})

		

	})
})