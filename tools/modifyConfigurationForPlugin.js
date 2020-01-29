var fs = require('fs');
var jsonfile = require("jsonfile");
var execSync = require('child_process').execSync;

process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception occured!');
    console.error(err.stack);
});
var targetedPlugin = process.argv[2]
var configLocation = __dirname + `/../plugins/${targetedPlugin}/conf.json`
var config = jsonfile.readFileSync(configLocation);
var processArgv = process.argv.splice(3,process.argv.length)
var arguments = {};
processArgv.forEach(function(val) {
    var theSplit = val.split('=');
    var index = (theSplit[0] || '').trim();
    var value = theSplit[1];
    if(index.indexOf('addToConfig') > -1 || index == 'addToConfig'){
        try{
            value = JSON.parse(value)
            config = Object.assign(config,value)
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
                if(index === 'key'){
                    console.log(`Modifying main conf.json with updated key.`)
                    execSync(`node ${__dirname}/modifyConfiguration.js addToConfig='{"pluginKeys":{"${config.plug}":"${value}"}}'`,function(err){
                        console.log(err)
                    })
                }
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
