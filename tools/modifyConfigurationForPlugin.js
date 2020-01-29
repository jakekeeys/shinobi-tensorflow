var fs = require('fs');
var jsonfile = require("jsonfile");
var execSync = require('child_process').execSync;
var anError = function(message,dontShowExample){
    console.log(message)
    if(!dontShowExample){
        console.log('Example of usage :')
        console.log('node tool/modifyConfigurationForPlugin.js tensorflow key=1234asdfg port=8080')
    }
}
var testValueForObject = function(jsonString){
    var newValue = jsonString + ''
    try{
        newValue = JSON.parse(jsonString)
    }catch(err){

    }
    if(typeof newValue === 'object'){
        return true
    }
    return false
}
process.on('uncaughtException', function (err) {
    console.error('Uncaught Exception occured!');
    console.error(err.stack);
});
var targetedPlugin = process.argv[2]
if(!targetedPlugin || targetedPlugin === '' || targetedPlugin.indexOf('=') > -1){
    return anError('Specify a plugin folder name as the first argument.')
}
var pluginLocation = __dirname + `/../plugins/${targetedPlugin}/`
fs.stat(pluginLocation,function(err){
    if(!err){
        var configLocation = `${pluginLocation}conf.json`
        var config = jsonfile.readFileSync(configLocation);
        var processArgv = process.argv.splice(3,process.argv.length)
        var arguments = {};
        if(processArgv.length === 0){
            return anError('No changes made. Add arguments to add or modify.')
        }
        processArgv.forEach(function(val) {
            var theSplit = val.split('=');
            var index = (theSplit[0] || '').trim();
            var value = theSplit[1];
            if(index.indexOf('addToConfig') > -1 || index == 'addToConfig'){
                try{
                    value = JSON.parse(value)
                    config = Object.assign(config,value)
                }catch(err){
                    anError('Not a valid Data set. "addToConfig" value must be a JSON string. You may need to wrap it in singles quotes.')
                }
            }else{
                if(value==='DELETE'){
                    delete(config[index])
                }else{
                    if(testValueForObject(value)){
                        config[index] = JSON.parse(value);
                    }else{
                        if(index === 'key'){
                            console.log(`Modifying main conf.json with updated key.`)
                            execSync(`node ${__dirname}/modifyConfiguration.js addToConfig='{"pluginKeys":{"${config.plug}":"${value + ''}"}}'`,function(err){
                                console.log(err)
                            })
                            config[index] = value + ''
                        }else{
                            config[index] = value
                        }
                    }
                }
            }
            console.log(index + ': ' + value);
        });

        jsonfile.writeFile(configLocation,config,{spaces: 2},function(){
            console.log('Changes Complete. Here is what it is now.')
            console.log(JSON.stringify(config,null,2))
        })
    }else{
        anError(`Plugin "${targetedPlugin}" not found.`)
    }
})
