const async = require("async");
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
module.exports = {
    mergeDeep: mergeDeep,
    validateIntValue: (value) => {
        const newValue = !isNaN(parseInt(value)) ? parseInt(value) : null
        return newValue
    },
    arrayContains: (query,theArray) => {
        var foundQuery = false
        theArray.forEach((value) => {
            if(value.indexOf(query) > -1)foundQuery = true
        })
        return foundQuery
    },
    createQueue: (timeoutInSeconds, queueItemsRunningInParallel) => {
        return async.queue(function(action, callback) {
            setTimeout(function(){
                action(callback)
            },timeoutInSeconds * 1000 || 1000)
        },queueItemsRunningInParallel || 3)
    },
    copyObject: (obj) => {
        return Object.assign({},obj)
    },
    stringContains: (find,string,toLowerCase) => {
        var newString = string + ''
        if(toLowerCase)newString = newString.toLowerCase()
        return newString.indexOf(find) > -1
    },
    stringToSqlTime: (value) => {
        newValue = new Date(value.replace('T',' '))
        return newValue
    },
    queryStringToObject: (string) => {
        const newObject = {}
        string.split('&').forEach((piece) => {
            const parts = piece.split('=')
            const key = parts[0]
            const value = parts[1]
            newObject[key] = value
        })
        return newObject
    },
    createQueryStringFromObject: (theObject) => {
       const string = []
       const keys = Object.keys(theObject)
       keys.forEach((key) => {
          const value = theObject[key]
          if(value)string.push(`${key}=${value}`)
       })
       return string.join('&')
    }

}
