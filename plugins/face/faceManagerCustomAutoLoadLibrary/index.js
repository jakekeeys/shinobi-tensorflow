var fileUpload = require('express-fileupload')
module.exports = function(s,config,lang,app,io){
    if(!config.facesFolder)config.facesFolder = s.mainDirectory + '/plugins/face/faces/'
    config.facesFolder = s.checkCorrectPathEnding(config.facesFolder)
    const sendDataToConnectedSuperUsers = (data) => {
        return s.tx(data,'$')
    }
    const getFaceFolderNames = (callback) => {
        fs.readdir(config.facesFolder,(err,folders) => {
            var faces = []
            folders.forEach((folder)=>{
                var stats = fs.statSync(config.facesFolder + folder)
                if(stats.isDirectory()){
                    faces.push(folder)
                }
            })
            callback(faces)
        })
    }
    const getFaceImages = (callback) => {
        fs.readdir(config.facesFolder,(err,folders)=>{
            var faces = {}
            folders.forEach((name)=>{
                var stats = fs.statSync(config.facesFolder + name)
                if(stats.isDirectory()){
                    faces[name] = []
                    fs.readdir(config.facesFolder + name,(err,images)=>{
                        images.forEach((image)=>{
                            faces[name].push(image)
                        })
                    })
                }
            })
            callback(faces)
        })
    }
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/names', function (req,res){
        s.superAuth(req.params,function(resp){
            getFaceFolderNames((faces)=>{
                res.end(s.prettyPrint({
                    ok: true,
                    faces: faces
                }))
            })
        },res,req)
    })
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/images', function (req,res){
        s.superAuth(req.params,function(resp){
            getFaceImages((faces)=>{
                res.end(s.prettyPrint({
                    ok: true,
                    faces: faces
                }))
            })
        },res,req)
    })
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/image/:name/:image', function (req,res){
        s.superAuth(req.params,function(resp){
            const imagePath = config.facesFolder + req.params.name + '/' + req.params.image
            if(fs.existsSync(imagePath)){
                res.setHeader('Content-Type', 'image/jpeg')
                fs.createReadStream(imagePath).pipe(res)
            }else{
                res.setHeader('Content-Type', 'application/json')
                res.end(s.prettyPrint({
                    ok: false,
                    msg: lang['File Not Found']
                }))
            }
        },res,req)
    })
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/image/:name/:image/delete', function (req,res){
        s.superAuth(req.params,function(resp){
            const imagePath = config.facesFolder + req.params.name + '/' + req.params.image
            if(fs.existsSync(imagePath)){
                fs.unlink(imagePath,() => {
                    s.file('delete',imagePath)
                    sendDataToConnectedSuperUsers({
                        f:'faceManagerImageDeleted',
                        faceName: req.params.name,
                        fileName: req.params.image,
                        url: fileLink
                    })
                })
            }
            res.end(s.prettyPrint({
                ok: true,
            }))
        },res,req)
    })
    app.post(config.webPaths.superApiPrefix+':auth/faceManager/image/:name', fileUpload(), function (req,res){
        s.superAuth(req.params,function(resp){
            res.setHeader('Content-Type', 'application/json')
            var fileKeys = Object.keys(req.files)
            if(fileKeys.length == 0){
                return res.status(400).send('No files were uploaded.')
            }
            var filesUploaded = []
            fileKeys.forEach(function(key){
                var file = req.files[key]
                if(file.name.indexOf('.jpg') > -1 || file.name.indexOf('.jpeg') > -1){
                    filesUploaded.push(file.name)
                    file.mv(config.facesFolder + req.params.name + '/' + file.name, function(err) {
                        var fileLink = config.webPaths.superApiPrefix + req.params.auth + `/faceManager/image/${req.params.name}/${file.name}`
                        sendDataToConnectedSuperUsers({
                            f:'faceManagerImageUploaded',
                            faceName: req.params.name,
                            fileName: file.name,
                            url: fileLink
                        })
                    })
                }
            })
            var response = {
                ok: true,
                filesUploaded: filesUploaded
            }
            res.send(s.prettyPrint(response))
        },res,req)
    })
}
