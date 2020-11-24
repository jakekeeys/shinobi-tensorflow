const fs = require('fs');
const spawn = require('child_process').spawn;
module.exports = (config) => {
    var currentlyUpdating = false
    return {
        getConfiguration: () => {
            return new Promise((resolve,reject) => {
                fs.readFile(s.location.config,'utf8',function(err,data){
                    resolve(JSON.parse(data))
                })
            })
        },
        modifyConfiguration: (postBody) => {
            return new Promise((resolve,reject) => {
                try{
                    if(config.thisIsDocker){
                        const dockerConfigFile = '/config/conf.json'
                        fs.stat(dockerConfigFile,(err) => {
                            if(!err){
                                fs.writeFile(dockerConfigFile,JSON.stringify(postBody,null,3),function(){})
                            }
                        })
                    }
                }catch(err){
                    console.log(err)
                }
                fs.writeFile(s.location.config,JSON.stringify(postBody,null,3),function(err){
                    resolve(err)
                })
            })
        },
        updateSystem: () => {
            return new Promise((resolve,reject) => {
                if(!config.thisIsDocker){
                    if(currentlyUpdating){
                        resolve(true)
                        return
                    };
                    currentlyUpdating = true
                    const updateProcess = spawn('sh',[s.mainDirectory + '/UPDATE.sh'])
                    updateProcess.stderr.on('data',(data) => {
                        s.systemLog('UPDATE.sh',data.toString())
                    })
                    updateProcess.stdout.on('data',(data) => {
                        s.systemLog('UPDATE.sh',data.toString())
                    })
                    updateProcess.on('exit',(data) => {
                        resolve(true)
                        currentlyUpdating = false
                    })
                }else{
                    resolve(false)
                }
            })
        }
    }
}
