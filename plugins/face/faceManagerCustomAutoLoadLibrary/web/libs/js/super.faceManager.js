$(document).ready(function(){
    var faceManagerModal = $('#faceManager')
    var faceManagerImages = $('#faceManagerImages')
    var faceManagerForm = $('#faceManagerUploadForm')
    var faceNameField = $('#faceNameField')
    var getFaceImages = function(callback){
        $.get(superApiPrefix + $user.sessionKey + '/faceManager/images',function(response){
            callback(response.faces || [])
        })
    }
    var deleteFaceImage = function(name,image,callback){
        $.get(superApiPrefix + $user.sessionKey + '/faceManager/image/' + name + '/' + image + '/delete',function(response){
            callback(response)
        })
    }
    var deleteFaceFolder = function(name,callback){
        $.get(superApiPrefix + $user.sessionKey + '/faceManager/delete/' + name,function(response){
            callback(response)
        })
    }
    var moveFaceImage = function(name,image,newFaceName,callback){
        $.get(superApiPrefix + $user.sessionKey + '/faceManager/image/' + name + '/' + image + '/move/' + newFaceName + '/' + image + '?websocketResponse=1' ,function(response){
            callback(response)
        })
    }
    var getFaceImageHtml = function(name,image){
        return `<div class="col-3 p-2 face-image" face="${name}" image="${image}">
           <div class="face-image-bg" style="background-image:url('${superApiPrefix}${$user.sessionKey}/faceManager/image/${name}/${image}')">
               <div class="controls row m-0">
                   <div class="col p-0">
                        <a href="#" class="btn btn-sm btn-danger m-0 delete"><i class="fa fa-trash-o"></i></a>
                   </div>
                   <div class="col p-0 text-right">
                        <span class="badge badge-sm bg-dark pull-right">${name}</span>
                   </div>
               </div>
               <div class="controls-bottom">
                   <span class="badge badge-sm bg-dark">${image}</span>
               </div>
           </div>
       </div>`
    }
    var createFaceHeader = function(name){
        return `<div face="${name}" class="mt-4 mb-2 face-title"><span class="badge bg-dark badge-lg">${name}</span> <a class="badge badge-danger badge-lg deleteFolder" face="${name}"><i class="fa fa-times text-danger"></i></a></div>`
    }
    var drawFaceImages = function(){
        getFaceImages(function(faces){
            var html = ''
            $.each(faces,function(name,images){
                // if(images.length === 0)return
                html += `${createFaceHeader(name)}<div class="row face-container" face="${name}">`
                $.each(images,function(n,image){
                    html += getFaceImageHtml(name,image)
                })
                html += `</div>`
            })
            faceManagerImages.html(html)
            $.each(faces,function(name,images){
                activateDroppableContainer(name)
            })
            activateDraggableImages()
            prettySizeFaceImages()
        })
    }
    var prettySizeFaceImages = function(){
        var faceImagesRendered = faceManagerImages.find('.face-image')
        var faceHeight = faceImagesRendered.first().width()
        faceImagesRendered.css('height',faceHeight)
    }
    var activateDroppableContainer = function(name){
        var row = faceManagerImages.find(`.row[face="${name}"]`)
        try{
            row.droppable("destroy")
        }catch(err){

        }
        row.droppable({
            tolerance: "intersect",
            accept: ".face-image",
            activeClass: "ui-state-default",
            hoverClass: "ui-state-hover",
            drop: function(event, ui) {
                var el = $(this)
                var newFace = el.attr('face')
                var faceImageElement = $(ui.draggable)
                var oldFace = faceImageElement.attr('face')
                var fileName = faceImageElement.attr('image')
                if(oldFace !== newFace){
                    moveFaceImage(oldFace,fileName,newFace)
                }else{
                    faceImageElement.css({
                        top: 0,
                        left: 0,
                    })
                }
            }
        })
    }
    var activateDraggableImages = function(name){
        var imageEls = faceManagerImages.find(`.face-image`)
        try{
            imageEls.draggable("destroy")
        }catch(err){

        }
        imageEls.draggable({
            appendTo: "body",
            cursor: "move",
            // helper: 'clone',
            revert: "invalid"
        });
    }
    var createFaceImageBlock = function(row,faceName,fileName){
        var existingBlock = row.find(`[face="${faceName}"][image="${fileName}"]`)
        if(existingBlock.length > 0){
            existingBlock.draggable('destroy')
            existingBlock.remove()
        }
        row.prepend(getFaceImageHtml(faceName,fileName))
    }
    faceManagerModal.on('shown.bs.modal',function(){
        drawFaceImages()
    })
    $(window).resize(function(){
        prettySizeFaceImages()
    })
    faceManagerImages.on('click','.delete',function(e){
        e.preventDefault()
        var el = $(this).parents('.face-image')
        var faceName = el.attr('face')
        var faceImage = el.attr('image')
        $.confirm.create({
            title: lang.deleteImage,
            body: lang.deleteImageText + `<div class="mt-3"><img style="width:100%;border-radius:5px;" src="${superApiPrefix}${$user.sessionKey}/faceManager/image/${faceName}/${faceImage}"></div>`,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                deleteFaceImage(faceName,faceImage,function(response){
                    console.log(response)
                })
            }
        })
        return false;
    })
    faceManagerImages.on('click','.deleteFolder',function(e){
        e.preventDefault()
        var faceName = $(this).attr('face')
        $.confirm.create({
            title: lang.deleteFace,
            body: lang.deleteFaceText,
            clickOptions: {
                class: 'btn-danger',
                title: lang.Delete,
            },
            clickCallback: function(){
                deleteFaceFolder(faceName,function(response){
                    console.log(response)
                })
            }
        })
        return false;
    })
    $('#fileinput').change(function(){
        var name = faceNameField.val()
        $.ajax({
          url: superApiPrefix + $user.sessionKey + '/faceManager/image/' + name,
          type: 'POST',
          data: new FormData(faceManagerForm[0]),
          cache: false,
          contentType: false,
          processData: false,
        },function(data){
            console.log(data)
        })
    })
    $('#tablist').append('<li class="nav-item">\
        <a class="nav-link" data-toggle="modal" data-target="#faceManager">' + lang.faceManager + '</a>\
    </li>')
    $.ccio.ws.on('f',function(d){
        switch(d.f){
            case'faceManagerImageUploaded':
                var row = faceManagerImages.find(`.row[face="${d.faceName}"]`)
                if(row.length === 0){
                    faceManagerImages.append(`${createFaceHeader(d.faceName)}<div class="row face-container" face="${d.faceName}"></div>`)
                    row = faceManagerImages.find(`.row[face="${d.faceName}"]`)
                    activateDroppableContainer(d.faceName)
                }
                createFaceImageBlock(row,d.faceName,d.fileName)
                activateDraggableImages()
                prettySizeFaceImages()
            break;
            case'faceManagerImageDeleted':
                $(`.face-image[face="${d.faceName}"][image="${d.fileName}"]`).remove()
            break;
            case'faceManagerFolderDeleted':
                $(`[face="${d.faceName}"]`).remove()
            break;
        }
    })
})
