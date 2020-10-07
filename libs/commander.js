const { Worker } = require('worker_threads');
module.exports = function(s,config,lang,app){
    const { modifyConfiguration, getConfiguration } = require('./system/utils.js')(config)
    var runningWorker;
    config.machineId = config.p2pApiKey + '' + config.p2pGroupId
    config.p2pTargetAuth = config.p2pTargetAuth || s.gid(30)
    if(!config.p2pServerList)config.p2pServerList = {
        "vancouver-1": {
            name: 'Vancouver-1',
            host: 'p2p-vancouver-1.shinobi.cloud',
            p2pPort: '8084',
            webPort: '8000',
            maxNetworkSpeed: {
                up: 5000,
                down: 5000,
                shared: true
            },
            location: {
                lat: 49.284966,
                lon: -123.1140607
            }
        },
        "toronto-1": {
            name: 'Toronto-1',
            host: 'p2p-toronto-1.shinobi.cloud',
            p2pPort: '8084',
            webPort: '8000',
            maxNetworkSpeed: {
                up: 5000,
                down: 5000,
                shared: true
            },
            location: {
                lat: 43.644773,
                lon: -79.3862837
            }
        },
        "paris-1": {
            name: 'Paris-1',
            host: 'p2p-paris-1.shinobi.cloud',
            p2pPort: '8084',
            webPort: '8000',
            maxNetworkSpeed: {
                up: 200,
                down: 200,
                shared: true
            },
            location: {
                lat: 48.873877,
                lon: 2.295533
            }
        },
        "amsterdam-1": {
            name: 'Amsterdam-1',
            host: 'p2p-amsterdam-1.shinobi.cloud',
            p2pPort: '8084',
            webPort: '8000',
            maxNetworkSpeed: {
                up: 500,
                down: 500,
                shared: true
            },
            location: {
                lat: 52.348773,
                lon: 4.8846043
            }
        },
    }
    if(!config.p2pHostSelected)config.p2pHostSelected = 'paris-1'
    const stopWorker = () => {
        if(runningWorker){
            runningWorker.postMessage({
                f: 'exit'
            })
        }
    }
    const startWorker = () => {
        stopWorker()
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
    const beginConnection = () => {
        if(config.p2pTargetGroupId && config.p2pTargetUserId){
            runningWorker = startWorker()
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
                runningWorker = startWorker()
            })
        }
    }
    if(config.p2pEnabled){
        beginConnection()
    }
    /**
    * API : Superuser : Log delete.
    */
    app.post(config.webPaths.superApiPrefix+':auth/p2p/save', function (req,res){
        s.superAuth(req.params,async (resp) => {
            const response = {ok: true};
            const form = s.getPostData(req,'data',true)
            form.p2pEnabled = form.p2pEnabled === '1' ? true : false
            config = Object.assign(config,form)
            const currentConfig = await getConfiguration()
            const configError = await modifyConfiguration(Object.assign(currentConfig,form))
            if(configError)s.systemLog(configError)
            setTimeout(() => {
                if(form.p2pEnabled){
                    s.systemLog('Starting P2P')
                    beginConnection()
                }else{
                    s.systemLog('Stopping P2P')
                    stopWorker()
                }
            },2000)
            s.closeJsonResponse(res,response)
        },res,req)
    })
}
