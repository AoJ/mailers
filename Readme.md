
# Mailers


## Example
```js
var mailer = require("mailers").create("stub");


var message = {
	from:    "info@example.com",
	to:      "aoj@n13.cz",
	subject: "hello",
	text:    "world"
};

mailer.sendMail(message, function (err, response) {
	if(err) return console.error(err.stack);

	console.log(response);
});
```

## usage with mandrill
    MANDRILL_KEY=54ef0259-0372-415b-81c6 node app
    ...
    var mailer = require("mailers").create("mandrillApi")



## API for mailers
    var mailers = require("mailers")
* **<code>create(engineName, options)</code>** Nodemailer engin one "mandrillApi". Options is object for the engine. Can contain <code>maxConnections</code> to setup concurrency level, default is 10.


## API for mailer
    var mailer = require("mailers").create("stub")
* **<code>sendMail(message, cb)</code>** send email. Format of message is same as in nodemamiler.
* **<code>sendMailImmediately(message, cb)</code>** Send email as soon as posible, before others one queued.
* **<code>pause()</code>** pause sending
* **<code>resume()</code>** resume paused sending
* **<code>kill()</code>** stop sending
* **<code>isPaused()</code>** return bool if sending is paused
* **<code>concurrency([newValue])</code>** return sending concurrency
* **<code>remain()</code>** return how many emails remain in queue
* **<code>now()</code>** return how many emails are sendings at the time



## Events
mailer wrapper rising a events.
* **<code>drain</code>** the event is called when the last item from the queue has returned from the worker
* **<code>empty</code>** the event is called when the last item from the queue is given to a worker
* **<code>saturated</code>** the event is called when the queue length hits the concurrency limit, and further tasks will be queued