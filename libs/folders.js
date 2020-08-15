var fs = require('fs');
module.exports = function(s,config,lang){
    //directories
    s.group = {}
    if(!config.windowsTempDir&&s.isWin===true){config.windowsTempDir='C:/Windows/Temp'}
    if(!config.defaultMjpeg){config.defaultMjpeg=s.mainDirectory+'/web/libs/img/bg.jpg'}
    //default stream folder check
    if(!config.streamDir){
        if(s.isWin === false){
            config.streamDir = '/dev/shm'
        }else{
            config.streamDir = config.windowsTempDir
        }
        config.shmDir = `${s.checkCorrectPathEnding(config.streamDir)}`
        if(!fs.existsSync(config.streamDir)){
            config.streamDir = s.mainDirectory+'/streams/'
        }else{
            config.streamDir += '/streams/'
        }
    }
    if(!config.videosDir){config.videosDir=s.mainDirectory+'/videos/'}
    if(!config.binDir){config.binDir=s.mainDirectory+'/fileBin/'}
    if(!config.addStorage){config.addStorage=[]}
    s.dir={
        videos: s.checkCorrectPathEnding(config.videosDir),
        streams: s.checkCorrectPathEnding(config.streamDir),
        fileBin: s.checkCorrectPathEnding(config.binDir),
        addStorage: config.addStorage,
        languages: s.location.languages+'/'
    };
    //streams dir
    if(!fs.existsSync(s.dir.streams)){
        fs.mkdirSync(s.dir.streams);
    }
    //videos dir
    if(!fs.existsSync(s.dir.videos)){
        fs.mkdirSync(s.dir.videos);
    }
    //fileBin dir
    if(!fs.existsSync(s.dir.fileBin)){
        fs.mkdirSync(s.dir.fileBin);
    }
    //additional storage areas
    s.listOfStorage = [{
        name: lang['Default'],
        value: ""
    }]
    s.dir.addStorage.forEach(function(v,n){
        v.path = s.checkCorrectPathEnding(v.path)
        if(!fs.existsSync(v.path)){
            fs.mkdirSync(v.path);
        }
        s.listOfStorage.push({
            name: v.name,
            value: v.path
        })
    })
    //get audio files list
    s.listOfAudioFiles = [
        {
            name:lang['No Sound'],
            value:""
        }
    ]
    fs.readdirSync(s.mainDirectory + '/web/libs/audio').forEach(function(file){
        s.listOfAudioFiles.push({
            name: file,
            value: file
        })
    })
    //get themes list
    s.listOfThemes = [
        {
            name:lang['Default'],
            value:""
        }
    ]
    fs.readdirSync(s.mainDirectory + '/web/libs/themes').forEach(function(folder){
        s.listOfThemes.push({
            name: folder,
            value: folder
        })
    })
}
