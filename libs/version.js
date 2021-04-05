var exec = require('child_process').exec
module.exports = function(s,config,lang,app,io){
    var getRepositoryCommitId = function(callback){
        exec(`git rev-parse HEAD`,function(err,response){
            if(response){
                var data = response.toString()
                var isGitRespository = false
                if(data.indexOf('not a git repository') === -1){
                    s.currentVersion = data.trim()
                    isGitRespository = true
                    s.systemLog(`Current Version : ${s.currentVersion}`)
                }
            }else if(err){
                s.debugLog('Git is not installed.')
            }
            if(callback)callback(!isGitRespository,data)
        })
    }
    getRepositoryCommitId()
}
