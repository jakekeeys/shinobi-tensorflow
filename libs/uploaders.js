module.exports = function(s,config,lang){
    s.uploaderFields = []
    require('./uploaders/loader.js')(s,config,lang)
    const loadedLibraries = {
        //cloud storage
        s3based: require('./uploaders/s3based.js'),
        backblazeB2: require('./uploaders/backblazeB2.js'),
        amazonS3: require('./uploaders/amazonS3.js'),
        webdav: require('./uploaders/webdav.js'),
        //simple storage
        sftp: require('./uploaders/sftp.js'),
    }
    Object.keys(loadedLibraries).forEach((key) => {
        var loadedLib = loadedLibraries[key](s,config,lang)
        loadedLib.isFormGroupGroup = true
        s.uploaderFields.push(loadedLib)
    })
}
