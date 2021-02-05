$(document).ready(function(){
    var selectedMonitorId
    var loadedVideoEncoders = {}
    var blockWindow = $('#onvifDeviceManager')
    var blockWindowInfo = $('#onvifDeviceManagerInfo')
    var blockForm = blockWindow.find('form')
    var dateRangePicker = blockForm.find('[name="utcDateTime"]')
    var convertFormFieldNameToObjectKeys = function(formFields){
        var newObject = {}
        $.each(formFields,function(key,value){
            var keyPieces = key.split(':')
            var parent = null
            $.each(keyPieces,function(n,piece){
                if(!parent){
                    parent = newObject
                }
                if(keyPieces[n + 1]){
                    if(!parent[piece])parent[piece] = {}
                    parent = parent[piece]
                }else{
                    parent[piece] = value
                }
            })
        })
        return newObject
    }
    var converObjectKeysToFormFieldName = (object,parentKey) => {
        parentKey = parentKey ? parentKey : ''
        var theList = {}
        Object.keys(object).forEach((key) => {
            var value = object[key]
            var newKey = parentKey ? parentKey + ':' + key : key
            if(typeof value === 'string'){
                theList[newKey] = value
            }else if(value instanceof Object || value instanceof Array){
                theList = Object.assign(theList,converObjectKeysToFormFieldName(value,newKey))
            }
        })
        return theList
    }
    var setIntegerGuider = function(fieldName,theRange){
        blockForm.find(`[${fieldName}]`)
            .attr('min',theRange.Min)
            .attr('max',theRange.Max)
            .attr('placeholder',`Mininum : ${theRange.Min}, Maximum: ${theRange.Max}`);
    }
    var setGuidersInFormFields = function(onvifData){
        if(onvifData.videoEncoderOptions){
            var encoderOptions = onvifData.videoEncoderOptions
            //Encoding
            var hasH264 = !!encoderOptions.H264;
            var hasH265 = !!encoderOptions.H265;
            // var hasJPEG = !!encoderOptions.JPEG;
            var availableEncoders = []
            if(hasH264)availableEncoders.push('H264')
            if(hasH265)availableEncoders.push('H265')
            // if(hasJPEG)availableEncoders.push('JPEG')
            var html = ``
            $.each(availableEncoders,function(n,encoder){
                html += `<option value="${encoder}">${encoder}</option>`
            })
            blockForm.find('[name="Encoding"]').html(html)
            //Resolutions
            var html = ``
            $.each(encoderOptions.H264.ResolutionsAvailable,function(n,resolution){
                html += `<option value="${resolution.Width}x${resolution.Height}">${resolution.Width}x${resolution.Height}</option>`
            })
            blockForm.find('[detail="Resolution"]').html(html)
            //Profiles Supported
            var html = ``
            var profilesSupported = encoderOptions.H264.H264ProfilesSupported
            profilesSupported = typeof profilesSupported === 'string' ? [profilesSupported] : profilesSupported
            $.each(profilesSupported,function(n,profile){
                html += `<option value="${profile}">${profile}</option>`
            })
            blockForm.find('[name="H264:H264Profile"]').html(html)
            //GOV Length, Frame Rate, Encoding Interval Range
            setIntegerGuider('name="H264:GovLength"',encoderOptions.H264.GovLengthRange)
            setIntegerGuider('name="RateControl:FrameRateLimit"',encoderOptions.H264.FrameRateRange)
            setIntegerGuider('name="RateControl:EncodingInterval"',encoderOptions.H264.EncodingIntervalRange)
            setIntegerGuider('name="Quality"',encoderOptions.QualityRange)
        }
        if(onvifData.videoEncoders){
            loadedVideoEncoders = {}
            var html = ``
            onvifData.videoEncoders.forEach((encoder) => {
                html += `<option value="${encoder.$.token}">${encoder.Name}</option>`
                loadedVideoEncoders[encoder.$.token] = encoder
            })
            blockForm.find('[name=videoToken]').html(html)
        }
    }
    var writeOnvifDataToFormFields = function(onvifData){
        var formFields = {}
        if(onvifData.date){
            var utcDatePieces = onvifData.date.UTCDateTime
            var dateString = `${utcDatePieces.Date.Year}-${utcDatePieces.Date.Month}-${utcDatePieces.Date.Day} ${utcDatePieces.Time.Hour}:${utcDatePieces.Time.Minute}:${utcDatePieces.Time.Second} UTC`
            var parsedDate = new Date(dateString);
            console.log(dateString,parsedDate)
            formFields["utcDateTime"] = parsedDate
            formFields["dateTimeType"] = onvifData.date.DateTimeType
            formFields["daylightSavings"] = onvifData.date.DaylightSavings
            formFields["timezone"] = onvifData.date.TimeZone.TZ

        }
        if(onvifData.networkInterface){
            var ipConfig = onvifData.networkInterface.IPv4.Config
            var ipv4 = ipConfig.DHCP === 'true' ? ipConfig.LinkLocal.Address : ipConfig.Manual.Address || ipConfig.LinkLocal.Address
            formFields["setNetworkInterface:ipv4"] = ipv4
        }
        if(onvifData.gateway){
            formFields["setGateway:ipv4"] = onvifData.gateway
        }
        if(onvifData.hostname){
            formFields["setHostname:name"] = onvifData.hostname
        }
        if(onvifData.dns && onvifData.dns.DNSManual){
            var dnsList = onvifData.dns.DNSManual
            if(dnsList.IPv4Address){
                dnsList = dnsList.IPv4Address
            }else if(dnsList[0]){
                dnsList = dnsList.map((item) => {
                    return item.IPv4Address
                }).join(',')
            }else{
                dnsList = ''
            }
            formFields["setDNS:dns"] = dnsList
        }
        if(onvifData.ntp && onvifData.ntp.NTPManual){
            var ntpIp = onvifData.ntp.NTPManual.IPv4Address
            formFields["setNTP:ipv4"] = ntpIp
        }
        if(onvifData.protocols){
            onvifData.protocols.forEach((protocol) => {
                //RTSP, HTTP
                formFields[`setProtocols:${protocol.Name}`] = protocol.Port
            })
        }
        if(onvifData.videoEncoders){
            setFieldsFromOnvifKeys(onvifData.videoEncoders[0])
        }
        if(onvifData.imagingSettings && onvifData.imagingSettings.ok !== false){
            $('#Imaging').find('.form-group').hide()
            setFieldsFromOnvifKeys(onvifData.imagingSettings)
            $.each(onvifData.imagingSettings,function(key){
                $('#Imaging').find(`[name="${key}"]`).parents('.form-group').show()
            })
            $('#Imaging').show()
        }else{
            $('#Imaging').hide()
        }
        Object.keys(formFields).forEach((key) => {
            var value = formFields[key]
            blockForm.find(`[name="${key}"]`).val(value)
        })
        if(onvifData.date)dateRangePicker.data('daterangepicker').setStartDate(dateString)
    }
    var setFieldsFromOnvifKeys = function(encoder){
        var formFields = converObjectKeysToFormFieldName(encoder)
        Object.keys(formFields).forEach((key) => {
            var value = formFields[key]
            blockForm.find(`[name="${key}"]`).val(value).parents('.form-group')
        })
    }
    var rebootCamera = function(monitorId){
        $.confirm.create({
            title: lang['Reboot Camera'],
            body: lang.noUndoForAction,
            clickOptions: {
                title: lang['Reboot'],
                class: 'btn-warning'
            },
            clickCallback: function(){
                $.get($.ccio.init('location',$user)+$user.auth_token+'/onvifDeviceManager/'+$user.ke + '/' + monitorId + '/reboot',function(response){
                    new PNotify({
                        title: lang.rebootingCamera,
                        text: lang['Please Wait...'],
                        type: 'warning'
                    })
                })
            }
        })
    }
    var getUIFieldValuesFromCamera = function(monitorId){
        $.get($.ccio.init('location',$user)+$user.auth_token+'/onvifDeviceManager/'+$user.ke + '/' + monitorId,function(response){
            var onvifData = response.onvifData
            console.log(onvifData)
            if(onvifData && onvifData.ok === true){
                blockWindowInfo.html(JSON.stringify(onvifData,null,3))
                setGuidersInFormFields(onvifData)
                writeOnvifDataToFormFields(onvifData)
                blockWindow.modal('show')
            }else{
                new PNotify({
                    title: lang.ONVIFEventsNotAvailable,
                    text: lang.ONVIFEventsNotAvailableText1,
                    type: 'warning'
                })
            }
        })
    }
    var getUIFieldValuesFromForm = function(){
        var newObject = {}
        var formOptions = blockForm.serializeObject()
        $.each(formOptions,function(key,value){
            var enclosingObject = blockForm.find(`[name="${key}"]`).parents('.form-group-group').attr("id")
            if(key === 'utcDateTime'){
                //dateRangePicker
                newObject[enclosingObject + ':' + key] = dateRangePicker.data('daterangepicker').startDate._d
                console.log(`dateRangePicker.data('daterangepicker').startDate._d`,dateRangePicker.data('daterangepicker').startDate._d)
            }else{
                newObject[enclosingObject + ':' + key] = value
            }
        })
        return newObject
    }
    dateRangePicker.daterangepicker({
        singleDatePicker: true,
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        // timePickerIncrement: 30,
        locale: {
            format: 'YYYY-MM-DD HH:mm:ss'
        }
    },function(start, end, label){
        console.log(start)
    });
    $.aM.e.on('click','.open-onvif-device-manager',function(){
        var monitorId = $.aM.e.attr('mid')
        selectedMonitorId = `${monitorId}`
        getUIFieldValuesFromCamera(monitorId)
    })
    blockWindow.on('click','.onvif-device-reboot',function(){
        rebootCamera(selectedMonitorId)
    })
    blockForm.on('change','[name="videoToken"]',function(){
        var selectedEncoder = loadedVideoEncoders[$(this).val()]
        setFieldsFromOnvifKeys(selectedEncoder)
        blockForm.find('[detail="Resolution"]').val(`${selectedEncoder['Resolution:Width']}x${selectedEncoder['Resolution:Height']}`)
    })
    blockForm.on('change','[detail="Resolution"]',function(){
        var resolution = $(this).val().split('x')
        var width = resolution[0]
        var height = resolution[1]
        blockForm.find('[name="Resolution:Width"]').val(width)
        blockForm.find('[name="Resolution:Height"]').val(height)
    })
    blockForm.submit(function(e){
        e.preventDefault()
        $.confirm.create({
            title: lang.updateCamerasInternalSettings,
            body: lang.noUndoForAction,
            clickOptions: {
                title: lang['Save'],
                class:'btn-success'
            },
            clickCallback: function(){
                var postData = convertFormFieldNameToObjectKeys(getUIFieldValuesFromForm())
                console.log('postData',postData)
                $.post($.ccio.init('location',$user)+$user.auth_token+'/onvifDeviceManager/'+$user.ke + '/' + selectedMonitorId + '/save',{
                    data: JSON.stringify(postData)
                },function(response){
                    var notifyTitle = lang['Settings Changed']
                    var notifyText = lang.onvifdeviceSavedText
                    var notifyTextError = ''
                    var notifyType = 'success'
                    $.each(response.responses,function(key,response){
                        if(!response.ok){
                            notifyTextError = lang.onvifdeviceSavedFoundErrorText
                            notifyType = 'warning'
                        }
                    })
                    notifyText = notifyTextError ? notifyText + ' ' + notifyTextError : notifyText;
                    new PNotify({
                        title: notifyTitle,
                        text: notifyText,
                        type: notifyType,
                    })
                })
            }
        })
        return false;
    })
})
