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
    var getFaceImageHtml = function(name,image){
        return `<div class="col-3 p-0 face-image" face="${name}" image="${image}" style="background-image:url('${superApiPrefix}${$user.sessionKey}/faceManager/image/${name}/${image}')">
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
       </div>`
    }
    var drawFaceImages = function(){
        getFaceImages(function(faces){
            var html = ''
            $.each(faces,function(name,images){
                html += `<div class="row" face="${name}">`
                $.each(images,function(n,image){
                    html += getFaceImageHtml(name,image)
                })
                html += `</div>`
            })
            faceManagerImages.html(html)
            prettySizeFaceImages()
        })
    }
    var prettySizeFaceImages = function(){
        var faceImagesRendered = faceManagerImages.find('.face-image')
        var faceHeight = faceImagesRendered.first().width()
        faceImagesRendered.css('height',faceHeight)
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
        return false;
    })
    $('#fileinput').change(function(){
        for(var i = 0; i<this.files.length; i++){
            var name = faceNameField.val()
            var file =  this.files[i];
            if(!file)return;
            $.ajax({
              url: superApiPrefix + $user.sessionKey + '/faceManager/image/' + name + '/' + file.name,
              type: 'POST',
              data: new FormData(faceManagerForm[0]),
              cache: false,
              contentType: false,
              processData: false,
            },function(data){
                console.log(data)
            })
        }
    })
    $('#tablist').append('<li class="nav-item">\
        <a class="nav-link" data-toggle="modal" data-target="#faceManager">' + lang.faceManager + '</a>\
    </li>')
    $.ccio.ws.on('f',function(d){
        switch(d.f){
            case'faceManagerImageUploaded':
                var row = faceManagerImages.find(`.row[face="${d.faceName}"]`)
                if(row.length === 0){
                    faceManagerImages.append(`<div class="row" face="${d.faceName}"></div>`)
                    row = faceManagerImages.find(`.row[face="${d.faceName}"]`)
                }
                row.prepend(getFaceImageHtml(d.faceName,d.fileName))
                prettySizeFaceImages()
            break;
            case'faceManagerImageDeleted':
                $(`.face-image[face="${d.faceName}"][image="${d.fileName}"]`).remove()
            break;
        }
    })
})
