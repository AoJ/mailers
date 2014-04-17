var mailer = require(".." /* mailers */).create("stub");


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