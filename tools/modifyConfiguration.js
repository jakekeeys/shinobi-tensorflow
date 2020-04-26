process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception occured!');
    console.error(err.stack);
});
var configLocation = __dirname+'/../conf.json';
var fs = require('fs');
var jsonfile = require("jsonfile");
var config = jsonfile.readFileSync(configLocation);
var processArgv = process.argv.splice(2,process.argv.length)
var arguments = {};

function mergeDeep(...objects) {
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

processArgv.forEach(function(val) {
    var theSplit = val.split('=');
    var index = (theSplit[0] || '').trim();
    var value = theSplit[1];
    if(index.indexOf('addToConfig') > -1 || index == 'addToConfig'){
        try{
            value = JSON.parse(value)
            config = mergeDeep(config,value)
        }catch(err){
            console.log('Not a valid Data set. "addToConfig" value must be a JSON string. You may need to wrap it in singles quotes.')
        }
    }else{
        if(value==='DELETE'){
            delete(config[index])
        }else{
            try{
                config[index] = JSON.parse(value);
            }catch(err){
                config[index] = value;
            }
        }
    }
    console.log(index + ': ' + value);
});

jsonfile.writeFile(configLocation,config,{spaces: 2},function(){
    console.log('Changes Complete. Here is what it is now.')
    console.log(JSON.stringify(config,null,2))
})
