$(document).ready(function(){
    var faceManagerModal = $('#faceManager')
    var faceManagerImages = $('#faceManagerImages')
    var getFaceImages = function(callback){
        $.get(superApiPrefix + $user.sessionKey + '/faceManager/images',function(faces){
            callback(faces)
        })
    }
    var deleteFaceImage = function(name,image,callback){
        $.get(superApiPrefix + $user.sessionKey + '/faceManager/image/' + name + '/' + image,function(response){
            callback(response)
        })
    }
    var getFaceImageHtml = function(name,image){
        return `<div class="col-3 face-image" face="${name}" image="${image}">
           <div class="controls">
               <a class="btn btn-sm btn-default delete"><i class="fa fa-trash-o"></i></a>
           </div>
           <img src="${superApiPrefix}/faceManager/image/${name}/${image}">
       </div>`
    }
    var drawFaceImages = function(){
        var html = ''
        getFaceImages(function(faces){
            $.each(faces,function(name,images){
                html += `<div class="row" face="${name}">`
                $.each(images,function(n,image){
                    html += getFaceImageHtml(name,image)
                })
                html += `</div>`
            })
        })
        faceManagerImages.html(html)
    }
    var prettySizeFaceImages = function(){
        var faceImagesRendered = faceManagerImages.find('.face-image')
        var faceHeight = faceImagesRendered.first().width()
        faceImagesRendered.css('height',faceHeight)
    }
    faceManagerModal.on('shown.bs.modal',function(){
        drawFaceImages()
    })
    faceManagerImages.on('click','.delete',function(){
        var el = $(this).parents('.face-image')
        var faceName = el.attr('face')
        var faceImage = el.attr('image')
        $.confirm.create({
            title: lang['Delete Image'],
            body: lang.deleteImageText,
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
    })
    $('#tablist').append('<li class="nav-item">\
        <a class="nav-link" data-toggle="modal" data-target="#faceManager">' + lang.faceManager + '</a>\
    </li>')
    $.ccio.ws.on('f',function(d){
        switch(d.f){
            case'faceManagerImageUploaded':
                faceManagerImages.append(getFaceImageHtml(d.faceName,d.fileName))
            break;
            case'faceManagerImageDeleted':
                $(`.face-image[face="${d.faceName}"][image="${d.fileName}"]`).remove()
            break;
        }
    })
})
