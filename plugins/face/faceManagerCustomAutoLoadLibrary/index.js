var fs = require('fs')
var fileUpload = require('express-fileupload')
module.exports = function(s,config,lang,app,io){
    if(!config.facesFolder)config.facesFolder = s.mainDirectory + '/plugins/face/faces/'
    config.facesFolder = s.checkCorrectPathEnding(config.facesFolder)
    if(!fs.existsSync(config.facesFolder)){
        fs.mkdirSync(config.facesFolder)
    }
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
                    var images
                    try{
                        images = fs.readdirSync(config.facesFolder + name)
                    }catch(err){
                        images = []
                    }
                    images.forEach((image)=>{
                        faces[name].push(image)
                    })
                }
            })
            callback(faces)
        })
    }
    const getFaceImagesByName = (name,callback) => {
        var stats = fs.statSync(config.facesFolder + name)
        if(stats.isDirectory()){
            var images
            try{
                images = fs.readdirSync(config.facesFolder + name)
            }catch(err){
                images = []
            }
            callback(images)
        }else{
            callback([])
        }
    }
    const deletePath = (deletionPath,callback) => {
        if(fs.existsSync(deletionPath)){
            fs.unlink(deletionPath,() => {
                s.file('delete',deletionPath)
                if(callback)callback()
            })
        }else{
            if(callback)callback(true)
        }
    }
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/names', function (req,res){
        s.superAuth(req.params,function(resp){
            getFaceFolderNames((faces)=>{
                res.setHeader('Content-Type', 'application/json')
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
                res.setHeader('Content-Type', 'application/json')
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
            res.setHeader('Content-Type', 'application/json')
            const imagePath = config.facesFolder + req.params.name + '/' + req.params.image
            deletePath(imagePath,() => {
                sendDataToConnectedSuperUsers({
                    f:'faceManagerImageDeleted',
                    faceName: req.params.name,
                    fileName: req.params.image,
                })
                getFaceFolderNames((faces) => {
                    s.sendToAllDetectors({
                        f: 'recompileFaceDescriptors',
                        faces: faces
                    })
                })
            })
            res.end(s.prettyPrint({
                ok: true,
            }))
        },res,req)
    })
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/delete/:name', function (req,res){
        s.superAuth(req.params,function(resp){
            res.setHeader('Content-Type', 'application/json')
            const facePath = config.facesFolder + req.params.name
            deletePath(facePath,() => {
                getFaceFolderNames((faces) => {
                    s.sendToAllDetectors({
                        f: 'recompileFaceDescriptors',
                        faces: faces
                    })
                })
            })
            sendDataToConnectedSuperUsers({
                f:'faceManagerFolderDeleted',
                faceName: req.params.name,
            })
            res.end(s.prettyPrint({
                ok: true,
            }))
        },res,req)
    })
    app.get(config.webPaths.superApiPrefix+':auth/faceManager/image/:name/:image/move/:newName/:newImage', function (req,res){
        s.superAuth(req.params,function(resp){
            res.setHeader('Content-Type', 'application/json')
            const oldImagePath = config.facesFolder + req.params.name + '/' + req.params.image
            const newImagePath = config.facesFolder + req.params.newName + '/' + req.params.newImage
            const fileExists = fs.existsSync(oldImagePath)
            if(fileExists){
                fs.readFile(oldImagePath,(err,data) => {
                    fs.writeFile(newImagePath,data,() => {
                        fs.unlink(oldImagePath,() => {
                            s.file('delete',oldImagePath)
                            if(req.query.websocketResponse){
                                sendDataToConnectedSuperUsers({
                                    f:'faceManagerImageDeleted',
                                    faceName: req.params.name,
                                    fileName: req.params.image,
                                })
                                var fileLink = config.webPaths.superApiPrefix + req.params.auth + `/faceManager/image/${req.params.newName}/${req.params.newImage}`
                                sendDataToConnectedSuperUsers({
                                    f:'faceManagerImageUploaded',
                                    faceName: req.params.newName,
                                    fileName: req.params.newImage,
                                    url: fileLink
                                })
                            }
                            getFaceFolderNames((faces) => {
                                s.sendToAllDetectors({
                                    f: 'recompileFaceDescriptors',
                                    faces: faces
                                })
                            })
                        })
                    })
                })
            }
            res.end(s.prettyPrint({
                ok: fileExists,
            }))
        },res,req)
    })
    app.post(config.webPaths.superApiPrefix+':auth/faceManager/image/:name', fileUpload(), function (req,res){
        s.superAuth(req.params,function(resp){
            res.setHeader('Content-Type', 'application/json')
            var fileKeys = Object.keys(req.files || {})
            if(fileKeys.length == 0){
                return res.status(400).send('No files were uploaded.')
            }
            var filesUploaded = []
            var checkFile = (file) => {
                if(file.name.indexOf('.jpg') > -1 || file.name.indexOf('.jpeg') > -1){
                    filesUploaded.push(file.name)
                    if(!fs.existsSync(config.facesFolder + req.params.name)){
                        fs.mkdirSync(config.facesFolder + req.params.name)
                    }
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
            }
            fileKeys.forEach(function(key){
                var file = req.files[key]
                try{
                    if(file instanceof Array){
                        file.forEach(function(fileOfFile){
                            checkFile(fileOfFile)
                        })
                    }else{
                        checkFile(file)
                    }
                }catch(err){
                    console.log(file)
                    console.log(err)
                }
            })
            var response = {
                ok: true,
                filesUploaded: filesUploaded
            }
            res.send(s.prettyPrint(response))
            getFaceFolderNames((faces) => {
                s.sendToAllDetectors({
                    f: 'recompileFaceDescriptors',
                    faces: faces
                })
            })
        },res,req)
    })
}
