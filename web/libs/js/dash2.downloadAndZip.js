$(document).ready(function(){
    var downloadFile = function(remoteLink,onProgress,onSuccess){
        if(!onProgress)onProgress = function(){}
        if(!onSuccess)onSuccess = function(){}
        var xhr = new window.XMLHttpRequest();
        xhr.addEventListener("progress", function(evt) {
           if (evt.lengthComputable) {
               var percentComplete = (evt.loaded / evt.total * 100).toFixed(2);
               onProgress(percentComplete)
           }
        }, false)
        xhr.addEventListener('readystatechange', function(e) {
        	if(xhr.readyState == 2 && xhr.status == 200) {
        		// Download is being started
        	}
        	else if(xhr.readyState == 3) {
        		// Download is under progress
        	}
        	else if(xhr.readyState == 4) {
                onSuccess(xhr.response)
        		// Downloaing has finished

        		// request.response holds the file data
        	}
        })
        xhr.responseType = 'blob'

        // Downloading a JPEG file
        xhr.open('get', remoteLink)

        xhr.send()
    }
    var downloadBulkVideos = function(videos,onProgress,onSuccess){
        var fileBuffers = {}
        var numberOfCompletedDownloads = 0
        var getVideo = function(video){
            var url = video.href
            downloadFile(url,function(percent){
                if(onProgress)onProgress(video,percent)
            },function(buffer){
                ++numberOfCompletedDownloads
                fileBuffers[url] = Object.assign(video,{buffer: buffer})
                console.log(fileBuffers[url] )
                console.log(videos.length, numberOfCompletedDownloads)
                if(videos.length === numberOfCompletedDownloads){
                    if(onSuccess)onSuccess(fileBuffers)
                }else{
                    getVideo(videos[numberOfCompletedDownloads])
                }
            })
        }
        getVideo(videos[numberOfCompletedDownloads])
    }
    var saveFile = function(blob, filename) {
        console.log(blob,filename)
      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        const a = document.createElement('a');
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 0)
      }
    }
    var zipVideosAndDownload = function(videos,onSuccess){
        var zip = new JSZip();
        var zipFileName = `ShinobiVideos_${$.ccio.timeObject(new Date()).format('YYYY-MM-DDTHH-mm-ss')}.zip`
        var foldersCreated = {}
        var downloadBars = {}
        var progressBarHtml = []
        var videosCopy = Object.assign(videos,{})
        $.each(videosCopy,function(n,video){
            var fileZipName = `${$.ccio.timeObject(video.time).format('YYYY-MM-DDTHH-mm-ss')}.${video.ext}`
            var fileId = video.ke + video.mid + moment(video.time).format('YYYY-MM-DDTHH-mm-ss')
            video.fileId = fileId
            video.fileZipName = fileZipName
            if(!foldersCreated[video.ke]){
                foldersCreated[video.ke] = {}
                foldersCreated[video.ke]._zipFolder = zip.folder(video.ke)
            }
            if(!foldersCreated[video.ke][video.mid]){
                foldersCreated[video.ke][video.mid] = {}
                foldersCreated[video.ke][video.mid]._zipFolder = foldersCreated[video.ke]._zipFolder.folder(video.mid)
            }
            progressBarHtml.push(`<br><small></small><div id="download-${fileId}" class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div></div>`)
        })
        new PNotify({
            type:'notice',
            title: lang['Downloading Videos'],
            text: lang['Please Wait for Completion'] + progressBarHtml.join(''),
            hide: false,
            modules: {
                Buttons: {
                  closer: true,
                  sticker: false
                },
                Mobile: {
                  swipeDismiss: false
                }
            },
        })
        $.each(videosCopy,function(n,video){
            downloadBars[video.fileId] = $(`#download-${video.fileId} .progress-bar`)
        })
        downloadBulkVideos(videosCopy,function(video,percent){
            downloadBars[video.fileId].width(percent + '%').attr('aria-valuenow', percent)
        },function(videosWithBuffers){
            new PNotify({
                type:'success',
                title: lang['Zipping Videos'],
                text: lang['Please Wait for Completion']
            })
            $.each(videosWithBuffers,function(n,video){
                foldersCreated[video.ke][video.mid]._zipFolder.file(video.fileZipName, video.buffer)
            })
            zip.generateAsync({type:"blob"}).then(function(content) {
                saveFile(content, zipFileName)
                if(onSuccess)onSuccess(content)
            });
        })
    }
    $.zipVideosAndDownload = zipVideosAndDownload
})
