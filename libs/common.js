const async = require("async");
exports.copyObject = (obj) => {
  return Object.assign({},obj)
}
exports.createQueue = (timeoutInSeconds, queueItemsRunningInParallel) => {
    return async.queue(function(action, callback) {
        setTimeout(function(){
            action(callback)
        },timeoutInSeconds * 1000 || 1000)
    },queueItemsRunningInParallel || 3)
}
