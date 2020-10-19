const fs = require('fs');
const path = require('path');
const moment = require('moment');
module.exports = (processCwd) => {
    const parseJSON = (string) => {
        var parsed
        try{
            parsed = JSON.parse(string)
        }catch(err){

        }
        if(!parsed)parsed = string
        return parsed
    }
    const stringJSON = (json) => {
        try{
            if(json instanceof Object){
                json = JSON.stringify(json)
            }
        }catch(err){

        }
        return json
    }
    const stringContains = (find,string,toLowerCase) => {
        var newString = string + ''
        if(toLowerCase)newString = newString.toLowerCase()
        return newString.indexOf(find) > -1
    }
    const checkCorrectPathEnding = (x) => {
        var length=x.length
        if(x.charAt(length-1)!=='/'){
            x=x+'/'
        }
        return x.replace('__DIR__',processCwd)
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
    const nameToTime = (x) => {
        x = x.split('.')[0].split('T')
        if(x[1])x[1] = x[1].replace(/-/g,':')
        x = x.join(' ')
        return x
    }
    const generateRandomId = (x) => {
        if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < x; i++ )
            t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    }
    const utcToLocal = (time) => {
        return moment.utc(time).utcOffset(s.utcOffset).format()
    }
    const localToUtc = (time) => {
        return moment(time).utc()
    }
    const formattedTime = (e,x) => {
        if(!e){e=new Date};if(!x){x='YYYY-MM-DDTHH-mm-ss'};
        return moment(e).format(x);
    }
    return {
        parseJSON: parseJSON,
        stringJSON: stringJSON,
        stringContains: stringContains,
        checkCorrectPathEnding: checkCorrectPathEnding,
        nameToTime: nameToTime,
        mergeDeep: mergeDeep,
        generateRandomId: generateRandomId,
        utcToLocal: utcToLocal,
        localToUtc: localToUtc,
        formattedTime: formattedTime,
    }
}
