var workerFarm = require('worker-farm')
  , workers    = workerFarm(require.resolve('./sender.js'))
  , ret        = 0

workers("s", function (err, outp) {

})
