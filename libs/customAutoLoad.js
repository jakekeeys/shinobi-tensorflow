const fs = require('fs')
const request = require('request')
const unzipper = require('unzipper')
const fetch = require("node-fetch")
const spawn = require('child_process').spawn
module.exports = async (s,config,lang,app,io) => {
    const modulesBasePath = s.mainDirectory + '/libs/customAutoLoad/'
    const searchText = function(searchFor,searchIn){
        return searchIn.indexOf(searchFor) > -1
    }
    const extractNameFromPackage = (filePath) => {
        const filePathParts = filePath.split('/')
        const packageName = filePathParts[filePathParts.length - 1].split('.')[0]
        return packageName
    }
    const getModulePath = (name) => {
        return modulesBasePath + name + '/'
    }
    const getModules = () => {
        const foundModules = {}
        fs.readdirSync(modulesBasePath).forEach((moduleName) => {
            const modulePath = getModulePath(moduleName)
            const isDirectory = fs.lstatSync(modulePath).isDirectory()
            foundModules[moduleName] = {
                moduleName: moduleName,
                path: modulePath,
                isDirectory: isDirectory,
            }
            if(isDirectory){
                if(!fs.existsSync(modulePath + 'index.js')){
                    foundModules[moduleName].noIndex = true
                }
                if(!fs.existsSync(modulePath + 'package.json')){
                    foundModules[moduleName].properties = getModuleProperties(moduleName)
                }
            }else{
                foundModules[moduleName].isIgnitor = (moduleName.indexOf('.js') > -1)
                foundModules[moduleName].properties = {
                    name: moduleName
                }
            }
        })
        return foundModules
    }
    const downloadModule = (downloadUrl,packageName) => {
        const downloadPath = modulesBasePath + packageName
        fs.mkdirSync(downloadPath)
        return new Promise((resolve, reject) => {
            var completed = 0
            const directory = await unzipper.Open.url(request,downloadUrl);
            if(directory.files.length > 0){
                directory.files.forEach(async (file) => {
                    const content = await file.buffer();
                    fs.writeFile(downloadPath + '/' + file.path,content,(err) => {
                        if(err)console.log(err)
                        ++completed
                        if(directory.files.length === completed){
                            resolve()
                        }
                    })
                });
            }else{
                resolve()
            }
        })
    }
    const getModuleProperties = (name) => {
        const modulePath = getModulePath(name)
        const propertiesPath = modulePath + 'package.json'
        const properties = fs.existsSync(propertiesPath) ? s.parseJSON(fs.readFileSync(propertiesPath)) : {
            name: name
        }
        return properties
    }
    const installModule = (name) => {
        return new Promise((resolve, reject) => {
            //depending on module this may only work for Ubuntu
            const modulePath = getModulePath(name)
            const properties = getModuleProperties(name);
            const installerPath = modulePath + `INSTALL.sh`
            const propertiesPath = modulePath + 'package.json'
            // check for INSTALL.sh (ubuntu only)
            if(fs.existsSync(installerPath)){
                const installProcess = spawn(`sh`,installerPath)
                installProcess.stderr.on('data',(data) => {
                    console.log(data.toString())
                })
                installProcess.stdout.on('data',(data) => {
                    console.log(data.toString())
                })
                installProcess.on('exit',(data) => {
                    resolve()
                })
            }else if(fs.existsSync(propertiesPath)){
                // no INSTALL.sh found, check for package.json and do `npm install --unsafe-perm`
                const installProcess = spawn(`npm`,['install','--unsafe-perm'])
                installProcess.stderr.on('data',(data) => {
                    console.log(data.toString())
                })
                installProcess.stdout.on('data',(data) => {
                    console.log(data.toString())
                })
                installProcess.on('exit',(data) => {
                    resolve()
                })
            }
        })
    }
    const disableModule = (name,status) => {
        // set status to `false` to enable
        const modulePath = getModulePath(name)
        const properties = getModuleProperties(name);
        const propertiesPath = modulePath + 'package.json'
        var packageJson = JSON.parse(fs.readFileSync(propertiesPath))
        packageJson.disabled = status;
        fs.writeFileSync(propertiesPath,s.prettyPrint(packageJson))
    }
    const deleteModule = (name) => {
        // requires restart for changes to take effect
        const modulePath = getModulePath(name)
        fs.unlink(modulePath)
        s.file('delete',modulePath)
    }
    const loadModule = (shinobiModule) => {
        const moduleName = shinobiModule.name
        s.customAutoLoadModules[moduleName] = {}
        var customModulePath = modulesBasePath + '/' + moduleName
        if(shinobiModule.isIgnitor){
            s.customAutoLoadModules[moduleName].type = 'file'
            try{
                require(customModulePath)(s,config,lang,app,io)
            }catch(err){
                s.systemLog('Failed to Load Module : ' + moduleName)
                s.systemLog(err)
            }
        }else if(shinobiModule.isDirectory){
            s.customAutoLoadModules[moduleName].type = 'folder'
            try{
                require(customModulePath)(s,config,lang,app,io)
                fs.readdir(customModulePath,function(err,folderContents){
                    folderContents.forEach(function(name){
                        switch(name){
                            case'web':
                                var webFolder = s.checkCorrectPathEnding(customModulePath) + 'web/'
                                fs.readdir(webFolder,function(err,webFolderContents){
                                    webFolderContents.forEach(function(name){
                                        switch(name){
                                            case'libs':
                                            case'pages':
                                                if(name === 'libs'){
                                                    if(config.webPaths.home !== '/'){
                                                        app.use('/libs',express.static(webFolder + '/libs'))
                                                    }
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.home)+'libs',express.static(webFolder + '/libs'))
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.admin)+'libs',express.static(webFolder + '/libs'))
                                                    app.use(s.checkCorrectPathEnding(config.webPaths.super)+'libs',express.static(webFolder + '/libs'))
                                                }
                                                var libFolder = webFolder + name + '/'
                                                fs.readdir(libFolder,function(err,webFolderContents){
                                                    webFolderContents.forEach(function(libName){
                                                        var thirdLevelName = libFolder + libName
                                                        switch(libName){
                                                            case'js':
                                                            case'css':
                                                            case'blocks':
                                                                fs.readdir(thirdLevelName,function(err,webFolderContents){
                                                                    webFolderContents.forEach(function(filename){
                                                                        var fullPath = thirdLevelName + '/' + filename
                                                                        var blockPrefix = ''
                                                                        switch(true){
                                                                            case searchText('super.',filename):
                                                                                blockPrefix = 'super'
                                                                            break;
                                                                            case searchText('admin.',filename):
                                                                                blockPrefix = 'admin'
                                                                            break;
                                                                        }
                                                                        switch(libName){
                                                                            case'js':
                                                                                s.customAutoLoadTree[blockPrefix + 'LibsJs'].push(filename)
                                                                            break;
                                                                            case'css':
                                                                                s.customAutoLoadTree[blockPrefix + 'LibsCss'].push(filename)
                                                                            break;
                                                                            case'blocks':
                                                                                s.customAutoLoadTree[blockPrefix + 'PageBlocks'].push(fullPath)
                                                                            break;
                                                                        }
                                                                    })
                                                                })
                                                            break;
                                                            default:
                                                                if(libName.indexOf('.ejs') > -1){
                                                                    s.customAutoLoadTree.pages.push(thirdLevelName)
                                                                }
                                                            break;
                                                        }
                                                    })
                                                })
                                            break;
                                        }
                                    })
                                })
                            break;
                            case'languages':
                                var languagesFolder = s.checkCorrectPathEnding(customModulePath) + 'languages/'
                                fs.readdir(languagesFolder,function(err,files){
                                    if(err)return console.log(err);
                                    files.forEach(function(filename){
                                        var fileData = require(languagesFolder + filename)
                                        var rule = filename.replace('.json','')
                                        if(config.language === rule){
                                            lang = Object.assign(lang,fileData)
                                        }
                                        if(s.loadedLanguages[rule]){
                                            s.loadedLanguages[rule] = Object.assign(s.loadedLanguages[rule],fileData)
                                        }else{
                                            s.loadedLanguages[rule] = Object.assign(s.copySystemDefaultLanguage(),fileData)
                                        }
                                    })
                                })
                            break;
                            case'definitions':
                                var definitionsFolder = s.checkCorrectPathEnding(customModulePath) + 'definitions/'
                                fs.readdir(definitionsFolder,function(err,files){
                                    if(err)return console.log(err);
                                    files.forEach(function(filename){
                                        var fileData = require(definitionsFolder + filename)
                                        var rule = filename.replace('.json','').replace('.js','')
                                        if(config.language === rule){
                                            s.definitions = s.mergeDeep(s.definitions,fileData)
                                        }
                                        if(s.loadedDefinitons[rule]){
                                            s.loadedDefinitons[rule] = s.mergeDeep(s.loadedDefinitons[rule],fileData)
                                        }else{
                                            s.loadedDefinitons[rule] = s.mergeDeep(s.copySystemDefaultDefinitions(),fileData)
                                        }
                                    })
                                })
                            break;
                        }
                    })
                })
            }catch(err){
                s.systemLog('Failed to Load Module : ' + moduleName)
                s.systemLog(err)
            }
        }
    }
    const initializeAllModules = async () => {
        s.customAutoLoadModules = {}
        s.customAutoLoadTree = {
            pages: [],
            PageBlocks: [],
            LibsJs: [],
            LibsCss: [],
            adminPageBlocks: [],
            adminLibsJs: [],
            adminLibsCss: [],
            superPageBlocks: [],
            superLibsJs: [],
            superLibsCss: []
        }
        fs.readdir(modulesBasePath,function(err,folderContents){
            if(!err && folderContents.length > 0){
                getModules().forEach((shinobiModule) => {
                    if(shinobiModule.properties.disabled){
                        return;
                    }
                    loadModule(shinobiModule)
                })
            }else{
                fs.mkdirSync(modulesBasePath)
            }
        })
    }
    /**
    * API : Superuser : Custom Auto Load Package Download.
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/download', async (req,res) => {
        s.superAuth(req.params,function(resp){
            const url = req.body.downloadUrl
            const packageRoot = req.body.packageRoot || ''
            const packageName = req.body.packageName || extractNameFromPackage(url)
            const modulePath = getModulePath(packageName)
            await downloadModule(url,packageName)
            const properties = getModuleProperties(packageName)
            fs.renameSync(modulePath + packageRoot,modulesBasePath + properties.name)
            fs.unlinkSync(modulePath)
            s.file('delete',modulePath)
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Install.
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/install', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            await installModule(packageName)
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package set Status (Enabled or Disabled).
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/status', (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const status = req.body.status
            const packageName = req.body.packageName
            disableModule(packageName,status === 'true' ? true : false)
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Delete
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/delete', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            const packageName = req.body.packageName
            deleteModule(packageName)
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    /**
    * API : Superuser : Custom Auto Load Package Delete
    */
    app.post(config.webPaths.superApiPrefix+':auth/package/reloadAll', async (req,res) => {
        s.superAuth(req.params, async (resp) => {
            await initializeAllModules();
            s.closeJsonResponse(res,{ok: true})
        },res,req)
    })
    // Initialize Modules on Start
    await initializeAllModules();
}
