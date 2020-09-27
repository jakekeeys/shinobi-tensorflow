const fs = require('fs');
module.exports = (config) => {
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
        }
    }
}
