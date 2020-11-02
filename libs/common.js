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
const mergeDeep = function(...objects) {
  const isObject = obj => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat(...oVal);
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      }
      else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, {});
}
const arrayContains = (query,theArray) => {
    var foundQuery = false
    theArray.forEach((value) => {
        if(value.indexOf(query) > -1)foundQuery = true
    })
    return foundQuery
}
exports.mergeDeep = mergeDeep
exports.arrayContains = arrayContains
