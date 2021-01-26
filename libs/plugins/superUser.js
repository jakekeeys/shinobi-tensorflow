const fs = require('fs-extra');
const express = require('express')
const request = require('request')
const unzipper = require('unzipper')
const fetch = require("node-fetch")
const spawn = require('child_process').spawn
const {
  Worker
} = require('worker_threads');
module.exports = async (s,config,lang,app,io,currentUse) => {
    const {
        currentPluginCpuUsage,
        currentPluginGpuUsage,
        currentPluginFrameProcessingCount,
    } = currentUse;
    const {
        activateClientPlugin,
        initializeClientPlugin,
        deactivateClientPlugin,
    } = require('./utils.js')(s,config,lang)
    const {
        triggerEvent,
    } = require('../events/utils.js')(s,config,lang)
    const runningPluginWorkers = {}
    const runningInstallProcesses = {}
    const modulesBasePath = process.cwd() + '/plugins/'
    const extractNameFromPackage = (filePath) => {
        const filePathParts = filePath.split('/')
        const packageName = filePathParts[filePathParts.length - 1].split('.')[0]
        return packageName
    }
    const getModulePath = (name) => {
        return modulesBasePath + name + '/'
    }
    const getModuleConfiguration = (moduleName) => {
        var moduleConfig = {}
        const modulePath = modulesBasePath + moduleName
        if(fs.existsSync(modulePath + '/conf.json')){
            moduleConfig = getModuleProperties(moduleName,'conf')
        }else{
            if(fs.existsSync(modulePath + '/conf.sample.json')){
                moduleConfig = getModuleProperties(moduleName,'conf.sample')
            }else{
                moduleConfig = {
                    plug: moduleName.replace('shinobi-',''),
                    type: 'detector'
                }
            }
        }
        return moduleConfig
    }
    const getModule = (moduleName) => {
        const modulePath = modulesBasePath + moduleName
        const stats = fs.lstatSync(modulePath)
        var newModule;
        if(stats.isDirectory()){
            newModule = {
                name: moduleName,
                path: modulePath + '/',
                size: stats.size,
                lastModified: stats.mtime,
                created: stats.ctime,
            }
            var hasInstaller = false
            if(!fs.existsSync(modulePath + '/index.js')){
                hasInstaller = true
                newModule.noIndex = true
            }
            //package.json
            if(fs.existsSync(modulePath + '/package.json')){
                hasInstaller = true
                newModule.properties = getModuleProperties(moduleName)
            }else{
                newModule.properties = {
                    name: moduleName
                }
            }
            if(newModule.properties.disabled === undefined){
                newModule.properties.disabled = true
            }
            //conf.json
            newModule.config = getModuleConfiguration(moduleName)
            newModule.hasInstaller = hasInstaller
        }
        return newModule
    }
    const getModules = (asArray) => {
        const foundModules = {}
        fs.readdirSync(modulesBasePath).forEach((moduleName) => {
            foundModules[moduleName] = getModule(moduleName)
        })
        return asArray ? Object.values(foundModules) : foundModules
    }
    const downloadModule = (downloadUrl,packageName) => {
        const downloadPath = modulesBasePath + packageName
        fs.mkdirSync(downloadPath)
        return new Promise(async (resolve, reject) => {
            fs.mkdir(downloadPath, () => {
                request(downloadUrl).pipe(fs.createWriteStream(downloadPath + '.zip'))
                .on('finish',() => {
                    zip = fs.createReadStream(downloadPath + '.zip')
                    .pipe(unzipper.Parse())
                    .on('entry', async (file) => {
                        if(file.type === 'Directory'){
                            try{
                                fs.mkdirSync(modulesBasePath + file.path, { recursive: true })
                            }catch(err){

                            }
                        }else{
                            const content = await file.buffer();
                            fs.writeFile(modulesBasePath + file.path,content,(err) => {
                                if(err)console.log(err)
                            })
                        }
                    })
                    .promise()
                    .then(() => {
                        fs.remove(downloadPath + '.zip', () => {})
                        resolve()
                    })
                })
            })
        })
    }
    const getModuleProperties = (name,file) => {
        const modulePath = getModulePath(name)
        const propertiesPath = modulePath + `${file ? file : 'package'}.json`
        const properties = fs.existsSync(propertiesPath) ? s.parseJSON(fs.readFileSync(propertiesPath)) : {
            name: name
        }
        return properties
    }
    const installModule = (name) => {
        return new Promise((resolve, reject) => {
            if(!runningInstallProcesses[name]){
                //depending on module this may only work for Ubuntu
                const modulePath = getModulePath(name)
                const properties = getModuleProperties(name);
                const installerPath = modulePath + `INSTALL.sh`
                const propertiesPath = modulePath + 'package.json'
                var installProcess
                // check for INSTALL.sh (ubuntu only)
                if(fs.existsSync(installerPath)){
                    installProcess = spawn(`sh`,[installerPath])
                }else if(fs.existsSync(propertiesPath)){
                    // no INSTALL.sh found, check for package.json and do `npm install --unsafe-perm`
                    installProcess = spawn(`npm`,['install','--unsafe-perm','--prefix',modulePath])
                }
                if(installProcess){
                    const sendData = (data,channel) => {
                        const clientData = {
                            f: 'plugin-info',
                            module: name,
                            process: 'install-' + channel,
                            data: data.toString(),
                        }
                        s.tx(clientData,'$')
                        s.debugLog(clientData)
                    }
                    installProcess.stderr.on('data',(data) => {
                        sendData(data,'stderr')
                    })
                    installProcess.stdout.on('data',(data) => {
                        sendData(data,'stdout')
                    })
                    installProcess.on('exit',(data) => {
                        runningInstallProcesses[name] = null;
                    })
                    runningInstallProcesses[name] = installProcess
                }
                resolve()
            }else{
                resolve(lang['Already Installing...'])
            }
        })
    }
    const disableModule = (name,status) => {
        // set status to `false` to enable
        const modulePath = getModulePath(name)
        const properties = getModuleProperties(name);
        const propertiesPath = modulePath + 'package.json'
        var packageJson = {
            name: name
        }
        try{
            packageJson = JSON.parse(fs.readFileSync(propertiesPath))
        }catch(err){

        }
        packageJson.disabled = status;
        fs.writeFileSync(propertiesPath,s.prettyPrint(packageJson))
    }
    const deleteModule = (name) => {
        // requires restart for changes to take effect
        try{
            const modulePath = modulesBasePath + name
            fs.remove(modulePath, (err) => {
                console.log(err)
            })
            return true
        }catch(err){
            console.log(err)
            return false
        }
    }
    const unloadModule = (moduleName) => {
        const worker = runningPluginWorkers[moduleName]
        if(worker){
            worker.terminate()
            runningPluginWorkers[moduleName] = null
        }
    }
    const onWorkerMessage = (pluginName,type,data) => {
        switch(type){
            case'ocv':
                switch(data.f){
                    case'trigger':
                        triggerEvent(data)
                    break;
                    case's.tx':
                        s.tx(data.data,data.to)
                    break;
                    case'log':
                        s.systemLog('PLUGIN : '+data.plug+' : ',data)
                    break;
                    case's.sqlQuery':
                        s.sqlQuery(data.query,data.values)
                    break;
                    case's.knexQuery':
                        s.knexQuery(data.options)
                    break;
                }
            break;
            case'cpuUsage':
                currentPluginCpuUsage[pluginName] = data
            break;
            case'gpuUsage':
                currentPluginGpuUsage[pluginName] = data
            break;
            case'processCount':
                currentPluginFrameProcessingCount[pluginName] = data
            break;
        }
    }
    const loadModule = (shinobiModule) => {
        const moduleName = shinobiModule.name
        const moduleConfig = shinobiModule.config
        const modulePlugName = moduleConfig.plug
        const customModulePath = modulesBasePath + '/' + moduleName
        const worker = new Worker(customModulePath + '/' + shinobiModule.properties.main,{
            workerData: {ok: true}
        });
        initializeClientPlugin(moduleConfig)
        activateClientPlugin(moduleConfig,(data) => {
            worker.postMessage(data)
        })
        worker.on('message', (data) =>{
            onWorkerMessage(modulePlugName,...data)
        });
        worker.on('error', (err) =>{
            console.error(err)
        });
        worker.on('exit', (code) => {
            if (code !== 0){
                s.debugLog(`Worker (Plugin) stopped with exit code ${code}`);
            }
            deactivateClientPlugin(modulePlugName)
        });
        runningPluginWorkers[moduleName] = worker
    }
    const moveModuleToNameInProperties = (modulePath,packageRoot,properties) => {
        return new Promise((resolve,reject) => {
            const packageRootParts = packageRoot.split('/')
            const filename = packageRootParts[packageRootParts.length - 1]
            fs.move(modulePath + packageRoot,modulesBasePath + filename,(err) => {
                if(packageRoot){
                    fs.remove(modulePath, (err) => {
                        if(err)console.log(err)
                        resolve(filename)
                    })
                }else{
                    resolve(filename)
                }
            })
        })
    }
    const initializeAllModules = async () => {
        fs.readdir(modulesBasePath,function(err,folderContents){
            if(!err && folderContents.length > 0){
                getModules(true).forEach((shinobiModule) => {
                    if(!shinobiModule || shinobiModule.properties.disabled){
                        return;
                    }
                    loadModule(shinobiModule)
                })
            }else{
                fs.mkdir(modulesBasePath,() => {})
            }
        })
    }
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    app.get(config.webPaths.superApiPrefix+':auth/plugins/list', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            s.closeJsonResponse(res,{
                ok: true,
                modules: getModules()
            })
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/download', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            try{
                const url = req.body.downloadUrl
                const packageRoot = req.body.packageRoot || ''
                const packageName = req.body.packageName || extractNameFromPackage(url)
                const modulePath = getModulePath(packageName)
                await downloadModule(url,packageName)
                const properties = getModuleProperties(packageName)
                const newName = await moveModuleToNameInProperties(modulePath,packageRoot,properties)
                const chosenName = newName ? newName : packageName
                disableModule(chosenName,true)
                s.closeJsonResponse(res,{
                    ok: true,
                    moduleName: chosenName,
                    newModule: getModule(chosenName)
                })
            }catch(err){
                s.closeJsonResponse(res,{
                    ok: false,
                    error: err
                })
            }
        },res,req)
    })
    // /**
    // * API : Superuser : Custom Auto Load Package Update.
    // */
    // app.post(config.webPaths.superApiPrefix+':auth/plugins/update', async (req,res) => {
    //     s.superAuth(req.params, async (resp) => {
    //         try{
    //             const url = req.body.downloadUrl
    //             const packageRoot = req.body.packageRoot || ''
    //             const packageName = req.body.packageName || extractNameFromPackage(url)
    //             const modulePath = getModulePath(packageName)
    //             await downloadModule(url,packageName)
    //             const properties = getModuleProperties(packageName)
    //             const newName = await moveModuleToNameInProperties(modulePath,packageRoot,properties)
    //             const chosenName = newName ? newName : packageName
    //
    //             disableModule(chosenName,true)
    //             s.closeJsonResponse(res,{
    //                 ok: true,
    //                 moduleName: chosenName,
    //                 newModule: getModule(chosenName)
    //             })
    //         }catch(err){
    //             s.closeJsonResponse(res,{
    //                 ok: false,
    //                 error: err
    //             })
    //         }
    //     },res,req)
    // })
    /**
    * API : Superuser : Custom Auto Load Package Install.
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/install', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            const cancelInstall = req.body.cancelInstall === 'true' ? true : false
            const response = {ok: true}
            if(runningInstallProcesses[packageName] && cancelInstall){
                runningInstallProcesses[packageName].kill('SIGTERM')
            }else{
                const error = await installModule(packageName)
                if(error){
                    response.ok = false
                    response.msg = error
                }
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })
    /**
    * API : Superuser : Interact with Installer
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/command', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            const command = req.body.command || ''
            const response = {ok: true}
            try{
                runningInstallProcesses[packageName].stdin.write(`${command}\n`)
            }catch(err){
                response.ok = false
                response.msg = err
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })
    /**
    * API : Superuser : Update Plugin conf.json
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/configuration/update', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const response = {ok: true}
            const packageName = req.body.packageName
            const configPath = modulesBasePath + packageName + '/conf.json'
            const newPluginConfig = s.parseJSON(req.body.config) || {}
            try{
                await fs.promises.writeFile(configPath,s.prettyPrint(newPluginConfig))
            }catch(err){
                response.ok = false
                response.msg = err
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })
    /**
    * API : Superuser : Get Plugin conf.json
    */
    app.get(config.webPaths.superApiPrefix+':auth/plugins/configuration', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const response = {ok: true}
            const packageName = req.query.packageName
            const modulePath = modulesBasePath + packageName
            try{
                const shinobiModule = getModule(packageName)
                response.config = shinobiModule.config
            }catch(err){
                response.ok = false
                response.msg = err
            }
            s.closeJsonResponse(res,response)
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package set Status (Enabled or Disabled).
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/status', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const status = req.body.status
            const packageName = req.body.packageName
            const selection = status == 'true' ? true : false
            const theModule = getModule(packageName)
            disableModule(packageName,selection)
            if(theModule.config.hotLoadable === true){
                if(!selection){
                    loadModule(theModule)
                }else{
                    unloadModule(packageName)
                }
            }
            s.closeJsonResponse(res,{ok: true, status: selection})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Delete
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/delete', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            const response = deleteModule(packageName)
            s.closeJsonResponse(res,{ok: response})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Reload All
    */
    app.post(config.webPaths.superApiPrefix+':auth/plugins/reloadAll', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            await initializeAllModules();
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    // Initialize Modules on Start
    await initializeAllModules();
}
