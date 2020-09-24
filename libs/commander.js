module.exports = function(s,config,lang){
    if(config.p2pEnabled){
        const { Worker, isMainThread } = require('worker_threads');
        const startWorker = () => {
            // set the first parameter as a string.
            const pathToWorkerScript = __dirname + '/commander/worker.js'
            const workerProcess = new Worker(pathToWorkerScript)
            workerProcess.on('message',function(data){
                switch(data.f){
                    case'debugLog':
                        s.debugLog(...data.data)
                    break;
                    case'systemLog':
                        s.systemLog(...data.data)
                    break;
                }
            })
            setTimeout(() => {
                workerProcess.postMessage({
                    f: 'init',
                    config: config,
                    lang: lang
                })
            },2000)
            // workerProcess is an Emitter.
            // it also contains a direct handle to the `spawn` at `workerProcess.spawnProcess`
            return workerProcess
        }
        config.machineId = config.p2pApiKey + '' + config.p2pGroupId
        config.p2pTargetAuth = config.p2pTargetAuth || s.gid(30)
        if(config.p2pTargetGroupId && config.p2pTargetUserId){
            startWorker()
        }else{
            s.knexQuery({
                action: "select",
                columns: "ke,uid",
                table: "Users",
                where: [],
                limit: 1
            },(err,r) => {
                const firstUser = r[0]
                config.p2pTargetUserId = firstUser.uid
                config.p2pTargetGroupId = firstUser.ke
                startWorker()
            })
        }
    }
}
