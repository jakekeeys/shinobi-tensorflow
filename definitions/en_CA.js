module.exports = function(s,config,lang){
    return {
       "Monitor Settings": {
          "section": "Monitor Settings",
          "blocks": {
             "Identity": {
                "name": lang.Identity,
                "color": "grey",
                "isSection": true,
                "id":"monSectionIdentity",
                "blockquoteClass": "global_tip",
                "blockquote": `<div class="am_notice am_notice_new">${lang.IdentityText1}</div><div class="am_notice am_notice_edit">${lang.IdentityText2}</div>`,
                "info": [
                   {
                      "name": "mode",
                      "field": lang.Mode,
                      "fieldType": "select",
                      "description": "This is the primary task of the monitor.",
                      "default": "stop",
                      "example": "",
                      "selector": "h_m",
                      "possible": [
                         {
                            "name": lang.Disabled,
                            "value": "stop",
                            "info": "Inactive monitor, no process will be created in this mode."
                         },
                         {
                            "name": lang["Watch-Only"],
                            "value": "start",
                            "info": "Monitor will only stream, no recording will occur unless otherwise ordered by API or Detector."
                         },
                         {
                            "name": lang.Record,
                            "value": "record",
                            "info": "Continuous Recording. Segments are made every 15 minutes by default."
                         },
                         {
                            "name": lang.Idle,
                            "value": "idle",
                            "info": ""
                         }
                      ]
                   },
                   {
                      "name": "mid",
                      "field": lang["Monitor ID"],
                      "description": "This is a non-changeable identifier for the monitor. You can duplicate a monitor by double clicking the Monitor ID and changing it.",
                      "example": s.gid()
                   },
                   {
                      "name": "name",
                      "field": lang.Name,
                      "description": "This is the human-readable display name for the monitor.",
                      "example": "Bunny"
                   },
                   {
                      "name": "detail=max_keep_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Videos'],
                      "placeholder": "Default is Global value.",
                      "description": "The number of days to keep videos before purging for this monitor specifically.",
                   },
                   {
                      "name": "detail=notes",
                      "field": lang.Notes,
                      "description": "Comments you want to leave for this camera.",
                      "fieldType": "textarea",
                   },
                   {
                      "name": "detail=dir",
                      "field": lang["Storage Location"],
                      "description": "Location of where recorded files will be saved. You can configure more locations with the <code>addStorage</code> variable.",
                      "fieldType": "select",
                      "possible": s.listOfStorage
                  }
                ]
             },
             "Connection": {
                "name": lang.Connection,
                "color": "orange",
                "id": "monSectionConnection",
                "isSection": true,
                "blockquote":`<p>${lang.InputText1}</p>\
                ${lang.InputText2}\
                <p>${lang.InputText3}</p>`,
                "blockquoteClass":"global_tip",
                "info": [
                    {
                       "name": "type",
                       "fieldType": "select",
                       "selector": "h_t",
                       "field": lang["Input Type"],
                       "description": "The method that will used to consume the video stream.",
                       "default": "h264",
                       "example": "",
                       "possible": [
                            {
                               "name": "JPEG",
                               "value": "jpeg",
                               "info": "Reading snapshots from a URL and making a stream and/or video from them."
                            },
                            {
                               "name": "MJPEG",
                               "value": "mjpeg",
                               "info": "Similar to JPEG except the frame handling is done by FFMPEG, not Shinobi."
                            },
                            {
                               "name": "H.264 / H.265 / H.265+",
                               "value": "h264",
                               "info": "Reading a high quality video streas that sometimes include audio."
                            },
                            {
                               "name": "HLS (.m3u8)",
                               "value": "hls",
                               "info": "Reading a high quality video streas that sometimes include audio."
                            },
                            {
                               "name": "MPEG-4 (.mp4 / .ts)",
                               "value": "mp4",
                               "info": "A static file. Read at a lower rate and should not be used for an actual live stream."
                            },
                            {
                               "name": "Shinobi Streamer",
                               "value": "socket",
                               "info": "Websocket JPEG-based P2P stream."
                            },
                            {
                               "name": "Dashcam (Streamer v2)",
                               "value": "dashcam",
                               "info": "Websocket WebM-based P2P stream."
                            },
                            {
                               "name": lang.Local,
                               "value": "local",
                               "info": "Reading Capture Cards, Webcams, or Integrated Cameras."
                            },
                            {
                               "evaluation": "!!config.rtmpServer",
                               "name": "RTMP",
                               "value": "rtmp",
                               "info": `Learn to connect here : <a href="https://shinobi.video/articles/2019-02-14-how-to-push-streams-to-shinobi-with-rtmp" target="_blank">Article : How to Push Streams via RTMP to Shinobi</a>`
                            },
                            {
                               "name": "MxPEG",
                               "value": "mxpeg",
                               "info": "Mobotix MJPEG Stream"
                            },
                         ]
                    },
                    {
                        hidden:true,
                       "name": "detail=rtmp_key",
                       "form-group-class": "h_t_input h_t_rtmp",
                       "field": lang['Stream Key'],
                       "description": "Stream Key for incoming streams on the RTMP port.",
                       "default": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "detail=auto_host_enable",
                       "field": lang.Automatic,
                       "description": "Feed the individual pieces required to build a stream URL or provide the full URL and allow Shinobi to parse it for you.",
                       "selector": "h_auto_host",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer":"h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg h_t_local",
                       "default": "",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                        hidden:true,
                       "name": "detail=auto_host",
                       "field": lang["Full URL Path"],
                       "form-group-class": "h_auto_host_input h_auto_host_1",
                       "description": "The full Stream URL.",
                       "default": "",
                       "example": "rtsp://username:password@123.123.123.123/stream/1",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "protocol",
                       "field": lang["Connection Type"],
                       "description": "The protocol that will used to consume the video stream.",
                       "default": "RTSP",
                       "example": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": "HTTP",
                              "value": "http"
                           },
                           {
                              "name": "HTTPS",
                              "value": "https"
                           },
                           {
                              "name": "RTSP",
                              "value": "rtsp"
                           },
                           {
                              "name": "RTMP",
                              "value": "rtmp"
                           },
                           {
                              "name": "RTMPS",
                              "value": "rtmps"
                           },
                           {
                              "name": "UDP",
                              "value": "udp"
                           }
                        ]
                    },
                    {
                        hidden:true,
                       "name": "detail=rtsp_transport",
                       "field": lang["RTSP Transport"],
                       "description": "The transport protocol your camera will use. TCP is usually the best choice.",
                       "default": "",
                       "example": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer":"h_p_input h_p_rtsp",
                       "form-group-class-pre-pre-layer":"h_auto_host_input h_auto_host_0 auto_host_fill",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.Auto,
                              "value": "no",
                              "info": "Let FFMPEG decide. Normally it will try UDP first."
                           },
                           {
                              "name": "TCP",
                              "value": "tcp",
                              "info": "Set it to this if UDP starts giving undesired results."
                           },
                           {
                              "name": "UDP",
                              "value": "udp",
                              "info": "FFMPEG tries this first."
                           },
                           {
                              "name": "HTTP",
                              "value": "http",
                              "info": "Standard connection method."
                           }
                        ]
                    },
                    {
                        hidden:true,
                       "name": "detail=muser",
                       "field": lang.Username,
                       "description": "The user login for your camera",
                       "default": "",
                       "example": "kittenFinder",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "detail=mpass",
                       "fieldType": "password",
                       "field": lang.Password,
                       "description": "The password for your camera",
                       "default": "",
                       "example": "kittenCuddler",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "host",
                       "field": lang.Host,
                       "description": "Connection address",
                       "default": "",
                       "example": "111.111.111.111",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "possible": ""
                    },
                    {
                        hidden:true,
                       "name": "port",
                       "field": lang.Port,
                       "description": "Port number that your camera is streaming out on.",
                       "default": "80",
                       "example": "554",
                       "possible": "1-65535",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                    },
                    {
                        hidden:true,
                       "name": "detail=port_force",
                       "field": lang["Force Port"],
                       "description": "Using the default web port can allow automatic switch to other ports for streams like RTSP.",
                       "default": "0",
                       "example": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                        hidden:true,
                       "name": "path",
                       "field": lang.Path,
                       "description": "The path to your camera",
                       "default": "",
                       "example": "/videostream.cgi?1",
                       "possible": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg h_t_local",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                    },
                    {
                        hidden:true,
                       "name": "detail=fatal_max",
                       "field": lang['Retry Connection'],
                       "description": "The number of times to retry for network connection between the server and camera before setting the monitor to Disabled. No decimals. Set to 0 to retry forever.",
                       "default": "0",
                       "example": "",
                       "possible": "",
                       "form-group-class": "h_t_input h_t_h264 h_t_hls h_t_mp4 h_t_jpeg h_t_mjpeg h_t_local",
                       "form-group-class-pre-layer": "h_auto_host_input h_auto_host_0 auto_host_fill",
                    },
                    {
                       "name": "detail=skip_ping",
                       "field": lang['Skip Ping'],
                       "description": "Choose if a successful ping is required before a monitor process is started.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                       "name": "detail=is_onvif",
                       "field": lang.ONVIF,
                       "description": "Is this an ONVIF compliant camera?",
                       "default": "0",
                       "example": "",
                       "selector": "h_onvif",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                        hidden: true,
                       "name": "detail=onvif_port",
                       "field": lang['ONVIF Port'],
                       "description": `ONVIF is usually run on port <code>8000</code>. This can be <code>80</code> as well depending on your camera model.`,
                       "default": "8000",
                       "example": "",
                       "form-group-class": "h_onvif_input h_onvif_1",
                    },
                ]
            },
             "Input": {
                "name": lang.Input,
                "color": "forestgreen",
                "id": "monSectionInput",
                "isSection": true,
                "info": [
                   {
                       hidden:true,
                      "name": "detail=primary_input",
                      "field": lang['Primary Input'],
                      "description": "",
                      "default": "0:0",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "input-mapping",
                      "possible": [
                           {
                              "name": lang['All streams in first feed'] + "(0)",
                              "value": "0"
                           },
                           {
                              "name": lang['First stream in feed'] + '(0:0, ' + lang.Default + ')',
                              "value": "0:0"
                           },
                           {
                              "name": lang['Second stream in feed'] + "(0:1)",
                              "value": "0:1"
                           },
                           {
                              "name": lang['Video streams only'] + "(0:v)",
                              "value": "0:v"
                           },
                           {
                              "name": lang['Video stream only from first feed'] + "(0:v:0)",
                              "value": "0:v:0"
                           }
                        ]
                   },
                   {
                      "name": "detail=aduration",
                      "field": lang["Analyzation Duration"],
                      "description": "Specify how many microseconds are analyzed to probe the input. Set to 100000 if you are using RTSP and having stream issues.",
                      "default": "",
                      "example": "100000",
                      "possible": ""
                   },
                   {
                      "name": "detail=probesize",
                      "field": lang["Probe Size"],
                      "description": "Specify how big to make the analyzation probe for the input. Set to 100000 if you are using RTSP and having stream issues.",
                      "default": "",
                      "example": "100000",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_loop",
                      "field": lang['Loop Stream'],
                      "description": "Loop a static file so the file stream behaves like a live stream.",
                      "default": "1",
                      "example": "",
                      "form-group-class": "h_t_input h_t_mp4 h_t_local",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                      "name": "detail=sfps",
                      "field": lang['Monitor Capture Rate'],
                      "description": "Specify the Frame Rate (FPS) in which the camera is providing its stream in.",
                      "default": "",
                      "example": "25",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "height",
                      "field": lang["Height"],
                      "description": "Height of the stream image.",
                      "default": "480",
                      "example": "720, 0 for Auto",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "width",
                      "field": lang["Width"],
                      "description": "Width of the stream image.",
                      "default": "640",
                      "example": "1280, 0 for Auto",
                      "possible": ""
                   },
                   {
                     "name": "detail=accelerator",
                     "field": lang.Accelerator,
                     "description": "Hardware Acceleration (HWAccel) for decoding streams.",
                     "default": "",
                     "example": "",
                     "selector": "h_gpud",
                     "fieldType": "select",
                     "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                     ]
                   },
                   {
                        "name": "detail=hwaccel",
                        "field": lang.hwaccel,
                        "description": "Decoding Engine",
                        "default": "",
                        "example": "",
                        "form-group-class": "h_gpud_input h_gpud_1",
                        "fieldType": "select",
                        "possible": s.listOfHwAccels
                    },
                   {
                        "name": "detail=hwaccel_vcodec",
                        "field": lang.hwaccel_vcodec,
                        "description": "Decoding Engine",
                        "default": "",
                        "example": "",
                        "form-group-class": "h_gpud_input h_gpud_1",
                        "fieldType": "select",
                        "possible": [
                           {
                              "name": lang.Auto + '('+lang.Recommended+')',
                              "value": ""
                           },
                           {
                              "name": lang.NVIDIA,
                              "optgroup": [
                                  {
                                     "name": lang.h264_cuvid,
                                     "value": "h264_cuvid"
                                  },
                                  {
                                     "name": lang.hevc_cuvid,
                                     "value": "hevc_cuvid"
                                  },
                                  {
                                     "name": lang.mjpeg_cuvid,
                                     "value": "mjpeg_cuvid"
                                  },
                                  {
                                     "name": lang.mpeg4_cuvid,
                                     "value": "mpeg4_cuvid"
                                  },
                              ]
                           },
                           {
                              "name": lang["Quick Sync Video"],
                              "optgroup": [
                                  {
                                     "name": lang.h264_qsv,
                                     "value": "h264_qsv"
                                  },
                                  {
                                     "name": lang.hevc_qsv,
                                     "value": "hevc_qsv"
                                  },
                                  {
                                     "name": lang.mpeg2_qsv,
                                     "value": "mpeg2_qsv"
                                  },
                              ]
                           },
                           {
                              "name": lang['Raspberry Pi'],
                              "optgroup": [
                                  {
                                     "name": lang.h264_mmal,
                                     "value": "h264_mmal"
                                  },
                                  {
                                     "name": lang.mpeg2_mmal,
                                     "value": "mpeg2_mmal"
                                  },
                                  {
                                     "name": lang["MPEG-4 (Raspberry Pi)"],
                                     "value": "mpeg4_mmal"
                                  }
                              ]
                           },
                        ]
                    },
                    {
                         "name": "detail=hwaccel_device",
                         "field": lang.hwaccel_device,
                         "description": "",
                         "default": "",
                         "example": "",
                         "form-group-class": "h_gpud_input h_gpud_1",
                         "possible": ""
                     },
                     {
                         "name": "detail=use_coprocessor",
                         "field": lang['Use coProcessor'],
                         "description": "",
                         "default": "",
                         "example": "",
                         "fieldType": "select",
                         "form-group-class": "h_gpud_input h_gpud_1",
                         "possible": [
                            {
                               "name": lang.No,
                               "value": "0",
                            },
                            {
                               "name": lang.Yes,
                               "value": "1",
                            }
                         ]
                     },
                     {
                         "fieldType": 'div',
                         "id": "monSectionInputMaps"
                     },
                ]
             },
             "Stream": {
                "name": lang.Stream,

                "color": "navy",
                "id": "monSectionStream",
                "isSection": true,
                "input-mapping": "stream",
                "blockquoteClass": "global_tip",
                "blockquote": lang.StreamText,
                "info": [
                   {
                      "name": "detail=stream_type",
                      "field": lang["Stream Type"],
                      "description": "The method that will used to consume the video stream.",
                      "default": "mp4",
                      "example": "",
                      "selector": "h_st",
                      "fieldType": "select",
                      "attribute": `triggerChange="#add_monitor [detail=stream_vcodec]" triggerChangeIgnore="b64,mjpeg,jpeg,gif"`,
                      "possible": [
                           {
                              "name": lang.Poseidon,
                              "value": "mp4",
                              "info": "Poseidon is built on Kevin Godell's MP4 processing code. It simulates a streaming MP4 file but using the data of a live stream. Includes Audio. Some browsers can play it like a regular MP4 file. Streams over HTTP or WebSocket."
                           },
                           {
                              "name": lang['HEVC (H.265)'],
                              "value": "h265"
                           },
                           {
                              "name": lang['Base64 over Websocket'],
                              "value": "b64",
                              "info": "Sending Base64 encoded frames over WebSocket. This avoids caching but there is no audio."
                           },
                           {
                              "name": lang['JPEG (Auto Enables JPEG API)'],
                              "value": "jpeg"
                           },
                           {
                              "name": lang['MJPEG'],
                              "value": "mjpeg",
                              "info": "Standard Motion JPEG image. No audio."
                           },
                           {
                              "name": lang['FLV'],
                              "value": "flv",
                              "info": "Sending FLV encoded frames over WebSocket."
                           },
                           {
                              "name": lang['HLS (includes Audio)'],
                              "value": "hls",
                              "info": "Similar method to facebook live streams. <b>Includes audio</b> if input provides it. There is a delay of about 4-6 seconds because this method records segments then pushes them to the client rather than push as while it creates them."
                           }
                        ]
                   },
                   {
                       hidden:true,
                       "name": "detail=stream_flv_type",
                       "field": lang["Connection Type"],
                       "description": "This is for the Shinobi dashboard only. Both stream methods are still active and ready to use.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_st_input h_st_flv h_st_mp4 h_st_h265",
                       "possible": [
                          {
                             "name": lang.HTTP,
                             "value": "http",
                          },
                          {
                             "name": lang.Websocket,
                             "value": "ws",
                          }
                       ]
                   },
                   {
                       hidden:true,
                      "name": "detail=stream_flv_maxLatency",
                      "field": lang["Max Latency"],
                      "description": "",
                      "default": "10",
                      "example": "20000",
                      "form-group-class": "h_st_lat_input h_st_lat_ws",
                      "form-group-class-pre-layer": "h_st_input h_st_mjpeg",
                      "possible": ""
                   },
                   {
                       hidden:true,
                      "name": "detail=stream_mjpeg_clients",
                      "field": lang["# of Allow MJPEG Clients"],
                      "description": "",
                      "default": "20",
                      "example": "",
                      "form-group-class": "h_st_input h_st_mjpeg",
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_vcodec",
                      "field": lang['Video Codec'],
                      "description": "Video codec for streaming.",
                      "default": "copy",
                      "example": "",
                      "form-group-class": "h_st_input h_st_hls h_st_flv h_st_mp4 h_st_h265",
                      "fieldType": "select",
                      "selector": "h_hls_v",
                      "possible": [
                         {
                            "name": lang.Auto,
                            "value": "no",
                            "info": "Let FFMPEG choose."
                         },
                         {
                            "name": "libx264",
                            "value": "libx264",
                            "info": "Used for MP4 video."
                         },
                         {
                            "name": "libx265",
                            "value": "libx265",
                            "info": "Used for MP4 video."
                         },
                         {
                            "name": lang.copy,
                            "value": "copy",
                            "info": "Used for MP4 video. Has very low CPU usage but cannot use video filters and filesizes may be gigantic.  Best to setup your MP4 settings camera-side when using this option."
                         },
                         {
                             "name": lang['Hardware Accelerated'],
                             "optgroup": [
                                 {
                                    "name": "H.264 VA-API (Intel HW Accel)",
                                    "value": "h264_vaapi"
                                 },
                                 {
                                    "name": "H.265 VA-API (Intel HW Accel)",
                                    "value": "hevc_vaapi"
                                 },
                                 {
                                    "name": "H.264 NVENC (NVIDIA HW Accel)",
                                    "value": "h264_nvenc"
                                 },
                                 {
                                    "name": "H.265 NVENC (NVIDIA HW Accel)",
                                    "value": "hevc_nvenc"
                                 },
                                 {
                                    "name": "H.264 (Quick Sync Video)",
                                    "value": "h264_qsv"
                                 },
                                 {
                                    "name": "H.265 (Quick Sync Video)",
                                    "value": "hevc_qsv"
                                 },
                                 {
                                    "name": "MPEG2 (Quick Sync Video)",
                                    "value": "mpeg2_qsv"
                                 },
                                 {
                                    "name": "H.264 (Quick Sync Video)",
                                    "value": "h264_qsv"
                                 },
                                 {
                                    "name": "H.265 (Quick Sync Video)",
                                    "value": "hevc_qsv"
                                 },
                                 {
                                    "name": "MPEG2 (Quick Sync Video)",
                                    "value": "mpeg2_qsv"
                                 },
                                 {
                                    "name": "H.264 openMAX (Raspberry Pi)",
                                    "value": "h264_omx"
                                 }
                             ]
                         },
                      ]
                   },
                   {
                      "name": "detail=stream_acodec",
                      "field": lang["Audio Codec"],
                      "description": "Audio codec for streaming.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "h_st_input h_st_hls h_st_flv h_st_mp4 h_st_h265",
                      "possible": [
                         {
                            "name": lang.Auto,
                            "info": "Let FFMPEG choose.",
                            "value": ""
                         },
                         {
                            "name": lang["No Audio"],
                            "info": "No Audio, this is an option that must be set in some parts of the world due to legal reasons.",
                            "value": "no"
                         },
                         {
                            "name": "libvorbis",
                            "info": "Used for WebM video.",
                            "value": "libvorbis"
                         },
                         {
                            "name": "libopus",
                            "info": "Used for WebM video.",
                            "value": "libopus"
                         },
                         {
                            "name": "libmp3lame",
                            "info": "Used for MP4 video.",
                            "value": "libmp3lame"
                         },
                         {
                            "name": "aac",
                            "info": "Used for MP4 video.",
                            "value": "aac"
                         },
                         {
                            "name": "ac3",
                            "info": "Used for MP4 video.",
                            "value": "ac3"
                         },
                         {
                            "name": "copy",
                            "info": "Used for MP4 video. Has very low CPU usage but some audio codecs need custom flags like <code>-strict 2</code> for aac.",
                            "value": "copy"
                         }
                      ]
                   },
                   {
                      "name": "detail=hls_time",
                      "field": "HLS Segment Length",
                      "description": "How long each video segment should be, in minutes. Each segment will be drawn by the client through an m3u8 file. Shorter segments take less space.",
                      "default": "2",
                      "example": "",
                      "form-group-class-pre-layer": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "form-group-class": "h_st_input h_st_hls",
                      "possible": ""
                   },
                   {
                      "name": "detail=hls_list_size",
                      "field": "HLS List Size",
                      "description": "The number of segments maximum before deleting old segments automatically.",
                      "default": "2",
                      "example": "",
                      "form-group-class-pre-layer": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "form-group-class": "h_st_input h_st_hls",
                      "possible": ""
                   },
                   {
                      "name": "detail=preset_stream",
                      "field": "HLS Preset",
                      "description": "Preset flag for certain video encoders. If you find your camera is crashing every few seconds : try leaving it blank.",
                      "default": "",
                      "example": "ultrafast",
                      "form-group-class-pre-layer": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "form-group-class": "h_st_input h_st_hls h_st_flv h_st_mp4 h_st_h265",
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_quality",
                      "field": lang.Quality,
                      "description": "Low number means higher quality. Higher number means less quality.",
                      "default": "15",
                      "example": "1",
                      "form-group-class": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "possible": "1-23"
                   },
                   {
                      "name": "detail=stream_fps",
                      "field": lang['Frame Rate'],
                      "description": "The speed in which frames are displayed to clients, in Frames Per Second. Be aware there is no default. This can lead to high bandwidth usage.",
                      "default": "",
                      "example": "1",
                      "form-group-class": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_scale_x",
                      "field": lang.Width,
                      "description": "Width of the stream image that is output after processing.",
                      "default": "",
                      "fieldType": "number",
                      "numberMin": "1",
                      "example": "640",
                      "form-group-class": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "possible": ""
                   },
                   {
                      "name": "detail=stream_scale_y",
                      "field": lang.Height,
                      "description": "Height of the stream image that is output after processing.",
                      "default": "",
                      "fieldType": "number",
                      "numberMin": "1",
                      "example": "480",
                      "form-group-class": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "possible": ""
                   },
                   {
                      "name": "detail=rotate_stream",
                      "field": lang["Rotate"],
                      "description": "Change the viewing angle of the video stream.",
                      "default": "",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "possible": [
                           {
                              "name": lang["No Rotation"],
                              "value": "no"
                           },
                           {
                              "name": lang["180 Degrees"],
                              "value": "2,transpose=2"
                           },
                           {
                              "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                              "value": "0"
                           },
                           {
                              "name": lang["90 Clockwise"],
                              "value": "1"
                           },
                           {
                              "name": lang["90 Clockwise and Vertical Flip"],
                              "value": "2"
                           },
                           {
                              "name": lang["90 Clockwise and Vertical Flip"],
                              "value": "3"
                           }
                        ]
                   },
                   {
                      "name": "detail=signal_check",
                      "field": lang["Check Signal Interval"],
                      "description": "How often your client will check the stream to see if it is alive. This is calculated in minutes.",
                      "default": "0",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=signal_check_log",
                      "field": lang["Log Signal Event"],
                      "description": "This is for the client side only. It will display in the log thread when client side signal checks occur.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0",
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                   {
                      "name": "detail=svf",
                      "field": lang["Video Filter"],
                      "description": "Place FFMPEG video filters in this box to affect the streaming portion. No spaces.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_st_input h_st_mjpeg h_st_b64 h_st_hls h_st_gif h_st_flv h_st_mp4 h_st_h265 h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                      "possible": ""
                  },
                   {
                      "name": "detail=tv_channel",
                      "field": lang["TV Channel"],
                      "description": "This monitor will have TV Channel features enabled. You will be able to view it in your TV Channel list.",
                      "default": "",
                      "selector": "h_tvc",
                      "fieldType": "select",
                      "example": "",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0",
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                         }
                      ]
                   },
                   {
                      "name": "detail=tv_channel_id",
                      "field": lang["TV Channel ID"],
                      "description": "A Custom ID for the Channel.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_tvc_input h_tvc_1",
                      "possible": ""
                   },
                   {
                      "name": "detail=tv_channel_group_title",
                      "field": lang["TV Channel Group"],
                      "description": "A Custom Group for the Channel.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_tvc_input h_tvc_1",
                      "possible": ""
                   },
                ]
             },
             "Stream Timestamp": {
                "id": "monSectionStreamTimestamp",
                "name": lang["Stream Timestamp"],
                "color": "blue",
                isAdvanced: true,
                "section-class": "h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=stream_timestamp",
                       "selector":"h_stm",
                       "field": lang.Enabled,
                       "description": "A clock that is burned onto the frames of the video stream.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_font",
                      "field": "Font Path",
                      "description": "Font File to style your timestamp.",
                      "default": "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_font_size",
                      "field": "Font Size",
                      "description": "Font size in pt.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_color",
                      "field": "Text Color",
                      "description": "Timstamp text color.",
                      "default": "white",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_box_color",
                      "field": "Text Box Color",
                      "description": "Timstamp backdrop color.",
                      "default": "0x00000000@1",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_x",
                      "field": "Position X",
                      "description": "Horiztonal Position of Timestamp",
                      "default": "(w-tw)/2",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_timestamp_y",
                      "field": "Position Y",
                      "description": "Vertical Position of Timestamp",
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_stm_input h_stm_1",
                      "possible": ""
                   }
                ]
             },
             "Stream Watermark": {
                "id": "monSectionStreamWatermark",
                "name": lang['Stream Watermark'],
                "color": "blue",
                isAdvanced: true,
                "section-class": "h_hls_v_input h_hls_v_libx264 h_hls_v_libx265 h_hls_v_h264_nvenc h_hls_v_hevc_nvenc h_hls_v_no",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=stream_watermark",
                       "field": lang.Enabled,
                       "description": "An image that is burned onto the frames of the video stream.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_wat",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=stream_watermark_location",
                      "field": lang['Image Location'],
                      "description": "Image Location that will be used as Watermark.",
                      "default": "0",
                      "example": "/usr/share/watermark.logo",
                      "form-group-class": "h_wat_input h_wat_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": "detail=stream_watermark_position",
                       "field": lang['Image Position'],
                       "description": "An image that is burned onto the frames of the video stream.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_wat_input h_wat_1",
                       "possible": [
                           {
                              "name": lang["Top Right"],
                              "value": "tr"
                           },
                           {
                              "name": lang["Top Left"],
                              "value": "tl"
                           },
                           {
                              "name": lang["Bottom Right"],
                              "value": "br"
                           },
                           {
                              "name": lang["Bottom Left"],
                              "value": "bl"
                           }
                        ]
                   },
                ]
             },
             "Stream Channels": {
                "name": "Stream Channels",
                "color": "blue",
                "id": "monSectionStreamChannels",
                "emptyDiv": true
            },
             "JPEG API": {
                "name": lang['JPEG API'],
                "headerTitle": `${lang['JPEG API']} <small>${lang.Snapshot} (cgi-bin)</small>`,
                "id": "monSectionJPEGAPI",
                "color": "forestgreen",
                "isSection": true,
                "input-mapping": "snap",
                "info": [
                    {
                       "name": "detail=snap",
                       "field": lang.Enabled,
                       "description": "Get the latest frame in JPEG.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_sn",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_fps",
                      "field": lang['Frame Rate'],
                      "description": "",
                      "default": "1",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_scale_x",
                      "field": lang['Image Width'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_scale_y",
                      "field": lang['Image Height'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=snap_vf",
                      "field": lang['Video Filter'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                ]
             },
             "Recording": {
                "id": "monSectionRecording",
                "name": lang.Recording,
                "color": "red",
                "isSection": true,
                "input-mapping": "record",
                "blockquote": lang.RecordingText,
                "blockquoteClass": 'global_tip',
                "section-class": 'h_m_input h_m_record h_m_idle',
                "info": [
                    // {
                    //    "name": "height",
                    //    "field": lang.Height,
                    //    "description": "Height of the stream image.",
                    //    "default": "640",
                    //    "example": "1280",
                    //    "possible": ""
                    // },
                    // {
                    //    "name": "width",
                    //    "field": lang.Width,
                    //    "description": "Width of the stream image.",
                    //    "default": "480",
                    //    "example": "720",
                    //    "possible": ""
                    // },
                   {
                      "name": "ext",
                      "field": lang["Record File Type"],
                      "description": "The file type for your recorded video file.",
                      "default": "MP4",
                      "example": "",
                      "selector": "h_f",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": "MP4",
                            "value": "mp4",
                            "info": "This file type is playable is almost all modern web browsers, that includes mobile. The filesize just tends to be larger unless you lower the quality."
                         },
                         {
                            "name": "WebM",
                            "value": "webm",
                            "info": "Small filesize, low client compatibility. Good for uploading to sites like YouTube."
                         }
                      ]
                   },
                   {
                      "name": "detail=vcodec",
                      "field": lang["Video Codec"],
                      "description": "Video codec for recording.",
                      "default": "copy",
                      "example": "",
                      "selector": "h_vc",
                      "fieldType": "select",
                      "possible": [
                           {
                              "name": lang.Default,
                              "value": "default"
                           },
                           {
                              "name": lang.Auto,
                              "value": "none"
                           },
                           {
                              "name": "WebM",
                              "optgroup": [
                                 {
                                    "name": "libvpx (Default)",
                                    "value": "libvpx"
                                 },
                                 {
                                    "name": "libvpx-vp9",
                                    "value": "libvpx-vp9"
                                 }
                              ]
                           },
                           {
                              "name": "MP4",
                              "optgroup": [
                                 {
                                    "name": "libx265",
                                    "value": "libx265"
                                 },
                                 {
                                    "name": "libx264 (Default)",
                                    "value": "libx264"
                                 },
                                 {
                                    "name": "copy",
                                    "value": "copy"
                                 }
                              ]
                           },
                           {
                              "name": "MP4 Hardware Accelerated",
                              "optgroup": [
                                 {
                                    "name": "H.264 VA-API (Intel HW Accel)",
                                    "value": "h264_vaapi"
                                 },
                                 {
                                    "name": "H.265 VA-API (Intel HW Accel)",
                                    "value": "hevc_vaapi"
                                 },
                                 {
                                    "name": "H.264 NVENC (NVIDIA HW Accel)",
                                    "value": "h264_nvenc"
                                 },
                                 {
                                    "name": "H.265 NVENC (NVIDIA HW Accel)",
                                    "value": "hevc_nvenc"
                                 },
                                 {
                                    "name": "H.264 (Quick Sync Video)",
                                    "value": "h264_qsv"
                                 },
                                 {
                                    "name": "H.265 (Quick Sync Video)",
                                    "value": "hevc_qsv"
                                 },
                                 {
                                    "name": "MPEG2 (Quick Sync Video)",
                                    "value": "mpeg2_qsv"
                                 },
                                 {
                                    "name": "H.264 openMAX (Raspberry Pi)",
                                    "value": "h264_omx"
                                 }
                              ]
                           },
                           {
                              "name": "WebM Hardware Accelerated",
                              "optgroup": [
                                 {
                                    "name": "VP8 NVENC (NVIDIA HW Accel)",
                                    "value": "vp8_cuvid"
                                 },
                                 {
                                    "name": "VP9 NVENC (NVIDIA HW Accel)",
                                    "value": "vp9_cuvid"
                                 },
                                 {
                                    "name": "VP8 (Quick Sync Video)",
                                    "value": "vp8_qsv"
                                 }
                              ]
                           }
                        ]
                   },
                   {
                      "name": "detail=crf",
                      "field": lang.Quality,
                      "description": "Low number means higher quality. Higher number means less quality.",
                      "default": "15",
                      "example": "1",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": "1-23"
                   },
                   {
                      "name": "preset_record",
                      "field": lang.Preset,
                      "description": "Preset flag for certain video encoders. If you find your camera is crashing every few seconds : try leaving it blank.",
                      "default": "",
                      "example": "ultrafast",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=acodec",
                      "field": lang['Audio Codec'],
                      "description": "Audio codec for recording.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.Default,
                            "value": "default"
                         },
                         {
                            "name": lang.Auto,
                            "value": "none"
                         },
                         {
                            "name": lang["No Audio"],
                            "value": "no"
                         },
                         {
                            "name": "WebM",
                            "optgroup": [
                               {
                                  "name": `libvorbis (${lang.Default})`,
                                  "value": "libvorbis"
                               },
                               {
                                  "name": "libopus",
                                  "value": "libopus"
                               }
                            ]
                         },
                         {
                            "name": "MP4",
                            "optgroup": [
                               {
                                  "name": "libmp3lame",
                                  "value": "libmp3lame"
                               },
                               {
                                  "name": `aac (${lang.Default})`,
                                  "value": "aac"
                               },
                               {
                                  "name": "ac3",
                                  "value": "ac3"
                               },
                               {
                                  "name": "copy",
                                  "value": "copy"
                               }
                            ]
                         }
                      ]
                   },
                   {
                      "name": "fps",
                      "field": lang["Video Record Rate (FPS)"],
                      "description": "The speed in which frames are recorded to files, Frames Per Second. Be aware there is no default. This can lead to large files. Best to set this camera-side.",
                      "default": "",
                      "example": "2",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=record_scale_y",
                      "field": lang["Record Height"],
                      "description": "Height of the stream image.",
                      "default": "",
                      "example": "720",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=record_scale_x",
                      "field": lang["Record Width"],
                      "description": "Width of the stream image.",
                      "default": "",
                      "example": "1280",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   },
                   {
                      "name": "detail=cutoff",
                      "field": lang['Recording Segment Interval'],
                      "description": "In minutes. When to slice off and start a new video file.",
                      "default": "15",
                      "example": "60",
                      "attribute": `triggerChange="#add_monitor [detail=vcodec]"`,
                      "possible": ""
                   },
                   {
                      "name": "detail=rotate_record",
                      "field": lang["Rotate"],
                      "description": "Change the recording angle of the video stream.",
                      "default": "copy",
                      "example": "",
                      "selector": "h_vc",
                      "fieldType": "select",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": [
                           {
                              "name": lang["No Rotation"],
                              "value": "no"
                           },
                           {
                              "name": lang["180 Degrees"],
                              "value": "2,transpose=2"
                           },
                           {
                              "name": lang["90 Counter Clockwise and Vertical Flip (default)"],
                              "value": "0"
                           },
                           {
                              "name": lang["90 Clockwise"],
                              "value": "1"
                           },
                           {
                              "name": lang["90 Clockwise and Vertical Flip"],
                              "value": "2"
                           },
                           {
                              "name": lang["90 Clockwise and Vertical Flip"],
                              "value": "3"
                           }
                        ]
                   },
                   {
                      "name": "detail=vf",
                      "field": lang['Record Video Filter'],
                      "description": "Place FFMPEG video filters in this box to affect the recording portion. No spaces.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                      "possible": ""
                   }
                ]
             },
             "Recording Timestamp": {
                "id": "monSectionRecordingTimestamp",
                "name": lang['Recording Timestamp'],
                "color": "red",
                isAdvanced: true,
                "section-pre-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                "section-class": "h_m_input h_m_record h_m_idle",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=timestamp",
                       "selector":"h_rtm",
                       "field": lang.Enabled,
                       "description": "A clock that is burned onto the frames of the recorded video.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_font",
                      "field": "Font Path",
                      "description": "Font File to style your timestamp.",
                      "default": "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_font_size",
                      "field": "Font Size",
                      "description": "Font size in pt.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_color",
                      "field": "Text Color",
                      "description": "Timstamp text color.",
                      "default": "white",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_box_color",
                      "field": "Text Box Color",
                      "description": "Timstamp backdrop color.",
                      "default": "0x00000000@1",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_x",
                      "field": "Position X",
                      "description": "Horiztonal Position of Timestamp",
                      "default": "(w-tw)/2",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=timestamp_y",
                      "field": "Position Y",
                      "description": "Vertical Position of Timestamp",
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_rtm_input h_rtm_1",
                      "possible": ""
                   }
                ]
             },
             "Recording Watermark": {
                "id": "monSectionRecordingWatermark",
                "name": lang['Recording Watermark'],
                "color": "red",
                isAdvanced: true,
                "section-pre-class": "h_vc_input h_vc_libvpx h_vc_libvpx-vp9 h_vc_libx264 h_vc_libx265 h_vc_hevc_nvenc h_vc_h264_nvenc h_vc_h264_vaapi h_vc_hevc_vaapi h_vc_h264_qsv h_vc_hevc_qsv h_vc_mpeg2_qsv h_vc_default h_vc_none",
                "section-class": "h_m_input h_m_record h_m_idle",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=watermark",
                       "field": lang.Enabled,
                       "description": "An image that is burned onto the frames of the recorded video.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_wat",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=watermark_location",
                      "field": lang['Image Location'],
                      "description": "Image Location that will be used as Watermark.",
                      "default": "0",
                      "example": "/usr/share/watermark.logo",
                      "form-group-class": "h_wat_input h_wat_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": "detail=watermark_position",
                       "field": lang['Image Position'],
                       "description": "An image that is burned onto the frames of the recorded video.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_wat_input h_wat_1",
                       "possible": [
                           {
                              "name": lang["Top Right"],
                              "value": "tr"
                           },
                           {
                              "name": lang["Top Left"],
                              "value": "tl"
                           },
                           {
                              "name": lang["Bottom Right"],
                              "value": "br"
                           },
                           {
                              "name": lang["Bottom Left"],
                              "value": "bl"
                           }
                        ]
                   },
                ]
             },
             "Timelapse": {
                "name": lang['Timelapse'],
                "id": "monSectionTimelapse",
                "color": "red",
                "isSection": true,
                "input-mapping": "record_timelapse",
                "info": [
                    {
                       "name": "detail=record_timelapse",
                       "field": lang.Enabled,
                       "description": "Create a JPEG based timelapse.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_rec_ti",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_mp4",
                      "field": lang.Enabled,
                      "description": "Create an MP4 file at the end of each day for the timelapse.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_fps",
                      "field": lang['Creation Interval'],
                      "description": "",
                      "default": "900",
                      "example": "",
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                      "fieldType": "select",
                      "possible": [
                        {
                            "name": `5 ${lang.minutes}`,
                            "value": "300"
                        },
                        {
                            "name": `10 ${lang.minutes}`,
                            "value": "600"
                        },
                        {
                            "name": `15 ${lang.minutes}`,
                            "value": "900"
                        },
                        {
                            "name": `30 ${lang.minutes}`,
                            "value": "1800"
                        },
                        {
                            "name": `45 ${lang.minutes}`,
                            "value": "2700"
                        },
                        {
                            "name": `60 ${lang.minutes}`,
                            "value": "3600"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_scale_x",
                      "field": lang['Image Width'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_scale_y",
                      "field": lang['Image Height'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_vf",
                      "field": lang['Video Filter'],
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_rec_ti_input h_rec_ti_1",
                      "possible": ""
                   },
                ]
             },
             "Timelapse Watermark": {
                "id": "monSectionRecordingWatermark",
                "name": lang['Recording Watermark'],

                "color": "red",
                isAdvanced: true,
                "section-class": "h_rec_ti_input h_rec_ti_1",
                "isSection": true,
                "info": [
                    {
                       "name": "detail=record_timelapse_watermark",
                       "field": lang.Enabled,
                       "description": "An image that is burned onto the frames of the recorded video.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "selector": "h_wat_timelapse",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                   },
                   {
                       hidden: true,
                      "name": "detail=record_timelapse_watermark_location",
                      "field": lang['Image Location'],
                      "description": "Image Location that will be used as Watermark.",
                      "default": "0",
                      "example": "/usr/share/watermark.logo",
                      "form-group-class": "h_wat_timelapse_input h_wat_timelapse_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": "detail=record_timelapse_watermark_position",
                       "field": lang['Image Position'],
                       "description": "An image that is burned onto the frames of the recorded video.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_wat_timelapse_input h_wat_timelapse_1",
                       "possible": [
                           {
                              "name": lang["Top Right"],
                              "value": "tr"
                           },
                           {
                              "name": lang["Top Left"],
                              "value": "tl"
                           },
                           {
                              "name": lang["Bottom Right"],
                              "value": "br"
                           },
                           {
                              "name": lang["Bottom Left"],
                              "value": "bl"
                           }
                        ]
                   },
                ]
             },
             "Custom": {
                "name": lang.Custom,
                "color": "navy",
                "isSection": true,
                isAdvanced: true,
                "id": "monSectionCustom",
                "info": [
                   {
                      "name": "detail=cust_input",
                      "field": lang['Input Flags'],
                      "description": "Custom Flags that bind to the Input of the FFMPEG process.",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   // {
                   //     hidden: true,
                   //    "name": "detail=cust_rtmp",
                   //    "field": lang['RTMP Stream Flags'],
                   //    "description": "Custom Flags that bind to the RTMP stream.",
                   //    "default": "",
                   //    "example": "",
                   //    "form-group-class": "h_rtmp_input h_rtmp_1",
                   //    "possible": ""
                   // },
                   {
                      "name": "detail=cust_stream",
                      "field": lang["Stream Flags"],
                      "description": "Custom Flags that bind to the Stream (client side view) of the FFMPEG process.",
                      "default": "",
                      "example": "",
                      "form-group-class": "",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_snap",
                      "field": "Snapshot Flags",
                      "description": "Custom Flags that bind to the Snapshots.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_sn_input h_sn_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_record",
                      "field": lang["Recording Flags"],
                      "description": "Custom Flags that bind to the recording of the FFMPEG process.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_m_input h_m_record",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_detect",
                      "field": lang["Detector Flags"],
                      "description": "Custom Flags that bind to the stream Detector uses for analyzation.",
                      "default": "",
                      "example": "",
                      "form-group-class": "shinobi-detector",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=cust_sip_record",
                      "field": lang['Traditional Recording Flags'],
                      "description": "Custom Flags that bind to the output that the Event-Based Recordings siphon from.",
                      "default": "",
                      "example": "",
                      "form-group-class": "h_rec_mtd_input h_rec_mtd_sip",
                      "possible": ""
                   },
                   {
                      "name": "detail=custom_output",
                      "field": "Output Method",
                      "description": "Add a custom output like JPEG frames or send data straight to another server.",
                      "default": "",
                      "example": "",
                      "form-group-class": "",
                      "possible": ""
                   }
                ]
             },
             "Detector": {
                "name": lang['Global Detector Settings'],
                "headerTitle": `${lang['Global Detector Settings']} <small>${lang['Primary Engine']} : <b class="h_det_pam_input h_det_pam_1">Pixel Array</b><span class="h_det_pam_input h_det_pam_0"><b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></span></small></h4>`,
                "color": "orange",
                isAdvanced: true,
                "isSection": true,
                "input-mapping":"detector",
                "id": "monSectionDetector",
                "selector": "h_det",
                "attribute": `triggerChange="#add_monitor [detail=detector_record_method]"`,
                "blockquote": `${lang.DetectorText}\n<p class="shinobi-detector-msg"></p>`,
                "info": [
                   {
                      "name": "detail=detector",
                      "field": lang.Enabled,
                      "description": "This will add another output in the FFMPEG command for the motion detector.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "selector": "h_det",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_http_api",
                      "field": lang["Allow API Trigger"],
                      "description": "Do you want to allow HTTP triggers to this camera?",
                      "default": "1",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": `${lang.Always} (${lang.Default})`,
                            "value": "1"
                         },
                         {
                            "name": lang[`When Detector is On`],
                            "value": "2"
                         },
                         {
                            "name": lang[`When Detector is Off`],
                            "value": "3"
                         },
                         {
                            "name": lang.Never,
                            "value": "0"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_send_frames",
                      "field": lang["Send Frames"],
                      "description": "Push frames to the connected plugin to be analyzed.",
                      "default": "0",
                      "example": "",
                      "selector": "h_det_fra",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_lock_timeout",
                      "field": lang['Allow Next Trigger'],
                      "description": "Lockout for when the next trigger is allowed, to avoid overloading the database and receiving clients. Measured in milliseconds.",
                      "default": "2000",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_save",
                      "field": lang["Save Events to SQL"],
                      "description": "Save Motion Events in SQL. This will allow display of motion over video during the time motion events occured in the Power Viewer.",
                      "default": "1",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_fps",
                      "field": lang["Detector Rate"],
                      "description": "How many frames a second to send to the motion detector; 2 is the default.",
                      "default": "2",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_scale_x",
                      "field": lang["Feed-in Image Width"],
                      "description": "Width of the image being detected. Smaller sizes take less CPU.",
                      "default": "",
                      "example": "640",
                      "form-group-class": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_scale_y",
                      "field": lang["Feed-in Image Height"],
                      "description": "Height of the image being detected. Smaller sizes take less CPU.",
                      "default": "",
                      "example": "480",
                      "form-group-class": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_record_method",
                      "field": lang['How to Record'],
                      "description": "There are multiple ways to begin recording when an event occurs, like motion. Traditional Recording is the most user-friendly.",
                      "selector": "h_rec_mtd",
                      "default": "sip",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                           {
                              "name": lang['Traditional (Watch-Only, Includes Buffer)'],
                              "value": "sip"
                           },
                           {
                              "name": lang['Hotswap Modes (Watch-Only)'],
                              "value": "hot"
                           },
                           {
                              "name": lang['Delete Motionless Videos (Record)'],
                              "value": "del"
                           }
                        ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_trigger",
                      "field": lang['Trigger Record'],
                      "description": "This will order the camera to record if it is set to \"Watch-Only\" when a motion even is detected.",
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_trigger_record_fps",
                      "field": lang['Recording FPS Change on Start'],
                      "description": "",
                      "placeholder": lang['Blank for No Change'],
                      "default": "",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_timeout",
                      "field": lang["Recording Timeout"],
                      "description": "The length of time \"Trigger Record\" will run for. This is read in minutes.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_send_video_length",
                      "field": lang["Notification Video Length"],
                      "description": "In seconds. The length of the video that gets sent to your Notification service, like Email or Discord.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "possible": ""
                   },
                   {
                       hidden: true,
                      "name": "detail=watchdog_reset",
                      "field": lang["Timeout Reset on Next Event"],
                      "description": "If there is an overlap in trigger record should it reset.",
                      "default": "1",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_hot h_rec_mtd_sip",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_delete_motionless_videos",
                      "field": lang['Delete Motionless Video'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "form-group-class": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "h_rec_mtd_input h_rec_mtd_del",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=det_multi_trig",
                      "field": lang['Trigger Camera Groups'],
                      "description": "",
                      "default": "1",
                      "example": "",
                      "selector": "det_multi_trig",
                      "form-group-class": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                       id: "monSectionDetectorGroupMulti",
                      "name": lang['Trigger Camera Groups'],
                      "color": "forestgreen",
                       isFormGroupGroup: true,
                      "section-class": "det_multi_trig_input det_multi_trig_1",
                      "section-pre-class": "h_det_input h_det_1",
                      "info": [
                          {
                              "fieldType": 'ul',
                              "id": "monitor_group_detector_multi",
                              "class": "mdl-list"
                          },
                          {
                              hidden: true,
                             "name": "detail=group_detector_multi",
                             "field": "",
                             "description": "",
                             "default": "0",
                             "example": "",
                             "possible": ""
                          },
                      ],
                   },
                   {
                      "name": "detail=detector_webhook",
                      "field": "Webhook",
                      "description": "Send a GET request to a URL with some values from the event.",
                      "default": "0",
                      "example": "",
                      "selector": "h_det_web",
                      "fieldType": "select",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_webhook_url",
                      "field": lang['Webhook URL'],
                      "description": "",
                      "default": "",
                      "example": "http://111.111.111.111?mid={{MONITOR_ID}}&group={{GROUP_KEY}}&confidence={{CONFIDENCE}}",
                      "form-group-class": "h_det_web_input h_det_web_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_webhook_method",
                      "field": lang['Call Method'],
                      "description": "",
                      "default": "GET",
                      "example": "",
                      "form-group-class": "h_det_web_input h_det_web_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": `GET (${lang.Default})`,
                             "value": "GET"
                          },
                          {
                             "name": "PUT",
                             "value": "PUT"
                          },
                          {
                             "name": "POST",
                             "value": "POST"
                          }
                       ]
                   },
                   {
                      "name": "detail=detector_command_enable",
                      "field": lang['Command on Trigger'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "selector": "h_det_com",
                      "fieldType": "select",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_command",
                      "field": lang['Command'],
                      "description": "The command that will run. This is the equivalent of running a shell command from terminal.",
                      "default": "",
                      "form-group-class": "h_det_com_input h_det_com_1",
                      "example": "/home/script.sh {{MONITOR_ID}} {{GROUP_KEY}} {{CONFIDENCE}}",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_command_timeout",
                      "field": lang['Allow Next Command'],
                      "description": "This value is a timer to allow the next running of your script. This value is in minutes.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_det_com_input h_det_com_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                      "name": "detail=snap_seconds_inward",
                      "field": lang['Delay for Snapshot'],
                      "description": lang['in seconds'],
                      "default": "0",
                   },
                   {
                      "name": "detail=detector_mail",
                      "field": lang['Email on Trigger'],
                      "description": "Recieve an email of an image during a motion event to the master account for the camera group. You must setup SMTP details in conf.json.",
                      "default": "0",
                      "example": "",
                      "selector": "h_det_email",
                      "fieldType": "select",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_mail_timeout",
                      "field": lang['Allow Next Email'],
                      "description": "The amount of time until a trigger is allowed to send another email with motion details and another image.",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_det_email_input h_det_email_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                      "name": "detail=detector_discordbot",
                      "field": lang["Discord Alert on Trigger"],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "selector": "h_det_discord",
                      "fieldType": "select",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_discordbot_send_video",
                      "field": lang["Attach Video Clip"],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "h_det_discord_input h_det_discord_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=detector_discordbot_timeout",
                      "field": lang['Allow Next Discord Alert'],
                      "description": "",
                      "default": "10",
                      "example": "",
                      "form-group-class": "h_det_discord_input h_det_discord_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": ""
                   },
                   {
                      "name": "detail=use_detector_filters",
                      "field": lang['Detector Filters'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "selector": "h_det_fil",
                      "fieldType": "select",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "name": "detail=use_detector_filters_object",
                      "field": lang['Filter for Objects only'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "form-group-class": "h_det_fil_input h_det_fil_1",
                      "form-group-class-pre-layer": "h_det_input h_det_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": "detail=cords",
                   },
                   {
                       hidden: true,
                      "name": "detail=detector_filters",
                   },
                   {
                      "fieldType": "btn",
                      "class": `btn-danger`,
                      "attribute": `monitor="region"`,
                      "btnContent": `<i class="fa fa-grav"></i> &nbsp; ${lang['Region Editor']}`,
                      "description": "",
                      "default": "",
                      "example": "",
                      "form-group-class-pre-pre-layer": "h_det_input h_det_1",
                      "form-group-class-pre-layer": "form-group",
                      "possible": ""
                   },
                   {
                       hidden: true,
                       "name": lang['Motion Detection'],
                       "headerTitle": `${lang['Motion Detection']} <small>${lang['Primary Engine']} : <b class="h_det_pam_input h_det_pam_1">Pixel Array</b><span class="h_det_pam_input h_det_pam_0"><b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></span></small>`,
                       "color": "orange",
                       id: "monSectionDetectorMotion",
                       isSection: true,
                       isAdvanced: true,
                       isFormGroupGroup: true,
                       "section-class": "h_det_input h_det_1",
                       "info": [
                           {
                              "name": "detail=detector_pam",
                              "field": lang["Use Built-In"],
                              "description": "Use Kevin Godell's Motion Detector. This is built into Shinobi and requires no other configuration to activate.",
                              "selector": "h_det_pam",
                              "default": "0",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_show_matrix",
                              "field": lang["Show Matrices"],
                              "description": "Outline which pixels are detected as changed in one matrix.",
                              "default": "0",
                              "example": "",
                              "fieldType": "select",
                              "form-group-class": "h_det_pam_input h_det_pam_1",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_sensitivity",
                              "field": lang.Indifference,
                              "description": "This can mean multiple things depending on the detector used. Built-In Motion Detection defines this as \"Percentage Changed in View or Region\"",
                              "default": "0.5",
                              "example": "10",
                              "possible": ""
                           },
                           {
                              "name": "detail=detector_max_sensitivity",
                              "field": lang["Max Indifference"],
                              "description": "An upperbound to indifference. Any value over this amount will be ignored.",
                              "default": "",
                              "example": "75",
                              "possible": ""
                           },
                           {
                              "name": "detail=detector_threshold",
                              "field": lang["Trigger Threshold"],
                              "description": "Minimum number of detections to fire a motion event. Detections must be within the detector the threshold divided by detector fps seconds. For example, if detector fps is 2 and trigger threshold is 3, then three detections must occur within 1.5 seconds to trigger a motion event. This threshold is per detection region.",
                              "default": "1",
                              "example": "3",
                              "possible": "Any non-negative integer."
                           },
                           {
                              "name": "detail=detector_color_threshold",
                              "field": lang["Color Threshold"],
                              "description": "The amount of difference allowed in a pixel before it is considered motion.",
                              "default": "9",
                              "example": "9",
                              "possible": "Any non-negative integer."
                           },
                           {
                              "name": "detail=detector_frame",
                              "field": lang["Full Frame Detection"],
                              "description": "This will read the entire frame for pixel differences.",
                              "default": "1",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_noise_filter",
                              "field": lang['Noise Filter'],
                              "description": "Attempt to filter grain or repeated motion at a particular indifference.",
                              "default": "1",
                              "example": "",
                              "fieldType": "select",
                              "possible": [
                                 {
                                    "name": lang.No,
                                    "value": "0"
                                 },
                                 {
                                    "name": lang.Yes,
                                    "value": "1"
                                 }
                              ]
                           },
                           {
                              "name": "detail=detector_noise_filter_range",
                              "field": lang["Noise Filter Range"],
                              "description": "The amount of difference allowed in a pixel before it is considered motion.",
                              "default": "6",
                              "example": "9",
                              "possible": "Any non-negative integer."
                           },
                       ]
                   },
                   {
                       hidden: true,
                      "name": lang['\"No Motion"\ Detector'],
                      "color": "orange",
                      id: "monSectionNoMotionDetector",
                      isSection: true,
                      isAdvanced: true,
                      isFormGroupGroup: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_notrigger",
                             "field": lang.Enabled,
                             "description": "Check if motion has occured on an interval. If motion has occurred the check will be reset.",
                             "default": "0",
                             "example": "",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                         },
                         {
                            "name": "detail=detector_notrigger_mail",
                            "field": `Email on "No Motion"`,
                            "description": "If motion has not been detected after the timeout period you will recieve an email.",
                            "default": "0",
                            "example": "",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                            "name": "detail=detector_notrigger_timeout",
                            "field": lang.Timeout,
                            "description": "Timeout is calculated in minutes.",
                            "default": "10",
                            "example": "",
                            "possible": ""
                         }
                      ]
                   },
                   {
                       hidden: true,
                      "name": lang['Audio Detector'],
                      "color": "orange",
                      id: "monSectionAudioDetector",
                      isSection: true,
                      isAdvanced: true,
                      isFormGroupGroup: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_audio",
                             "field": lang.Enabled,
                             "description": "Check if Audio has occured at a certiain decible. Decible reading may not be accurate to real-world measurement.",
                             "default": "0",
                             "example": "",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                         },
                         {
                             "name": "detail=detector_audio_min_db",
                             "field": lang['Minimum dB'],
                             "description": "",
                             "default": "5",
                             "example": "",
                             "possible": ""
                          },
                          {
                             "name": "detail=detector_audio_max_db",
                             "field": lang['Maximum dB'],
                             "description": "",
                             "default": "",
                             "example": "",
                             "possible": ""
                          }
                      ]
                  },
                   {
                      "name": lang['Object Detection'],
                      "color": "orange",
                      id: "monSectionDetectorObject",
                      headerTitle: `${lang['Object Detection']} <small><b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></small>`,
                      isFormGroupGroup: true,
                      isSection: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_use_detect_object",
                             "field": lang.Enabled,
                             "description": "Create frames for sending to any connected Plugin.",
                             "default": "0",
                             "example": "",
                             "selector": "h_casc",
                             "fieldType": "select",
                             "possible": [
                                {
                                   "name": lang.No,
                                   "value": "0"
                                },
                                {
                                   "name": lang.Yes,
                                   "value": "1"
                                }
                             ]
                         },
                         {
                            "name": "detail=detector_send_frames_object",
                            "field": lang["Send Frames"],
                            "description": "Push frames to the connected plugin to be analyzed.",
                            "default": "0",
                            "example": "",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                            "name": "detail=detector_obj_region",
                            "field": lang['Require Object to be in Region'],
                            "description": "",
                            "default": "0",
                            "example": "",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                            "name": "detail=detector_use_motion",
                            "field": lang['Check for Motion First'],
                            "description": "",
                            "default": "0",
                            "example": "",
                            "selector": "h_det_mot_fir",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                        },
                        {
                            hidden: true,
                           "name": "detail=detector_fps_object",
                           "field": lang['Frame Rate'],
                           "description": "",
                           "default": "1",
                           "example": "",
                           "form-group-class": "h_det_mot_fir_input h_det_mot_fir_1",
                           "form-group-class-pre-layer": "h_det_pam_input h_det_pam_1",
                           "fieldType": "number",
                           "numberMin": "1",
                           "possible": ""
                        },
                        {
                            hidden: true,
                           "name": "detail=detector_scale_x_object",
                           "field": lang['Image Width'],
                           "description": "",
                           "default": "",
                           "example": "",
                           "form-group-class": "h_det_mot_fir_input h_det_mot_fir_1",
                           "form-group-class-pre-layer": "h_det_pam_input h_det_pam_1",
                           "fieldType": "number",
                           "numberMin": "1",
                           "possible": ""
                        },
                        {
                            hidden: true,
                           "name": "detail=detector_scale_y_object",
                           "field": lang['Image Height'],
                           "description": "",
                           "default": "",
                           "example": "",
                           "form-group-class": "h_det_mot_fir_input h_det_mot_fir_1",
                           "form-group-class-pre-layer": "h_det_pam_input h_det_pam_1",
                           "fieldType": "number",
                           "numberMin": "1",
                           "possible": ""
                        },
                      ]
                  },
                   {
                      hidden: true,
                     "name": lang['License Plate Detector'],
                     "color": "orange",
                     id: "monSectionLisencePlateDetector",
                     headerTitle: `${lang['Object Detection']} <small>${lang['Plugin']} : <b class="shinobi-detector_name"></b> <b class="shinobi-detector-invert">${lang['Not Connected']}</b><b class="shinobi-detector" style="display:none">${lang['Connected']}</b></small>`,
                     isSection: true,
                     isAdvanced: true,
                     isFormGroupGroup: true,
                     "section-pre-pre-class": "h_det_input h_det_1",
                     "section-pre-class": "h_casc_input h_casc_1",
                     "section-class": "shinobi-detector-opencv shinobi-detector-openalpr shinobi-detector_plug",
                     "info": [
                         {
                            "name": "detail=detector_lisence_plate",
                            "field": lang.Enabled,
                            "description": "Enable License Plate Recognition. OpenALPR plugin has this always enabled.",
                            "default": "0",
                            "example": "",
                            "fieldType": "select",
                            "possible": [
                               {
                                  "name": lang.No,
                                  "value": "0"
                               },
                               {
                                  "name": lang.Yes,
                                  "value": "1"
                               }
                            ]
                         },
                         {
                            "name": "detail=detector_lisence_plate_country",
                            "field": lang['Country of Plates'],
                            "description": "Choose the type of plates to recognize. Only US and EU are supported at this time.",
                            "default": "0",
                            "example": "",
                            "fieldType": "select",
                            "possible": [
                                 {
                                    "name": "US",
                                    "value": "us"
                                 },
                                 {
                                    "name": "EU",
                                    "value": "eu"
                                 }
                              ]
                          },
                      ]
                   },
                   {
                       hidden: true,
                      "name": lang['OpenCV Cascades'],
                      "color": "orange",
                      id: "monSectionOpenCVCascades",
                      headerTitle: `${lang['OpenCV Cascades']}<a class="pull-right btn btn-xs btn-default refresh_cascades" title="${lang['Refresh List of Cascades']}">&nbsp;<i class="fa fa-retweet"></i>&nbsp;</a>`,
                      blockquote: lang.opencvCascadesText,
                      isSection: true,
                      isAdvanced: true,
                      isFormGroupGroup: true,
                      "section-pre-pre-class": "h_det_input h_det_1",
                      "section-pre-class": "h_casc_input h_casc_1",
                      "section-class": "shinobi-detector-opencv shinobi-detector-openalpr shinobi-detector_plug",
                      "info": [
                          {
                              "fieldType": "div",
                              id: "detector_cascade_list",
                              style: "max-height: 300px;overflow: auto;"
                          }
                      ]
                  },
                   {
                       hidden: true,
                      "name": lang['Traditional Recording'],

                      "color": "orange",
                      id: "monSectionDetectorTraditionalRecording",
                      isSection: true,
                      isAdvanced: true,
                      isFormGroupGroup: true,
                      "section-class": "h_det_input h_det_1",
                      "info": [
                          {
                             "name": "detail=detector_buffer_vcodec",
                             "field": lang['HLS Video Encoder'],
                             "description": "",
                             "default": "0",
                             "example": "",
                             "selector": "h_buff",
                             "fieldType": "select",
                             "possible": [
                                 {
                                    "name": "Auto",
                                    "value": "auto"
                                 },
                                 {
                                    "name": "libx264",
                                    "value": "libx264"
                                 },
                                 {
                                    "name": "H.264 VA-API (Intel HW Accel)",
                                    "value": "h264_vaapi"
                                 },
                                 {
                                    "name": "H.265 VA-API (Intel HW Accel)",
                                    "value": "hevc_vaapi"
                                 },
                                 {
                                    "name": lang.copy,
                                    "value": "copy"
                                 }
                              ]
                          },
                          {
                             "name": "detail=detector_buffer_acodec",
                             "field": lang['HLS Audio Encoder'],
                             "description": "",
                             "default": "0",
                             "example": "",
                             "fieldType": "select",
                             "possible": [
                                 {
                                    "name": lang['No Audio'],
                                    "value": "no"
                                 },
                                 {
                                    "name": "Auto",
                                    "value": "auto"
                                 },
                                 {
                                    "name": "aac",
                                    "value": "aac"
                                 },
                                 {
                                    "name": "ac3",
                                    "value": "ac3"
                                 },
                                 {
                                    "name": "libmp3lame",
                                    "value": "libmp3lame"
                                 },
                                 {
                                    "name": lang.copy,
                                    "value": "copy"
                                 }
                              ]
                          },
                          {
                             "name": "detail=detector_buffer_fps",
                             "field": lang['Frame Rate'],
                             "description": "",
                             "default": "30",
                             "example": "",
                             "form-group-class": "h_buff_input h_buff_libx264 h_buff_h264_vaapi h_buff_hevc_vaapi",
                             "possible": ""
                          },
                          {
                             "name": "detail=detector_buffer_hls_time",
                             "field": lang['HLS Segment Length'],
                             "description": "How long each video segment should be, in seconds. Each segment will be drawn by the client through an m3u8 file. Shorter segments take less space.",
                             "default": "2",
                             "example": "",
                             "possible": ""
                          },
                          {
                             "name": "detail=detector_buffer_hls_list_size",
                             "field": lang['HLS List Size'],
                             "description": "The number of segments maximum before deleting old segments automatically.",
                             "default": "10",
                             "example": "",
                             "possible": ""
                          },
                          {
                             "name": "detail=detector_buffer_start_number",
                             "field": lang['HLS Start Number'],
                             "description": "",
                             "default": "0",
                             "example": "",
                             "form-group-class": "h_buff_input h_buff_libx264 h_buff_h264_vaapi h_buff_hevc_vaapi",
                             "possible": ""
                          },
                          {
                             "name": "detail=detector_buffer_live_start_index",
                             "field": lang['HLS Live Start Index'],
                             "description": "",
                             "default": "-3",
                             "example": "",
                             "form-group-class": "h_buff_input h_buff_libx264 h_buff_h264_vaapi h_buff_hevc_vaapi",
                             "possible": ""
                          },
                          {
                             "field": lang['Buffer Preview'],
                             id: "monEditBufferPreview",
                             "fieldType": "div",
                             "style": "width:100%;height:300px;background:#eceaea;border-radius:5px;color:#333;font-family:monospace"
                          },
                      ]
                   },
                ]
             },
             "Control": {
                "name": lang.Control,
                "color": "blue",
                id: "monSectionControl",
                isSection: true,
                "info": [
                    {
                       "name": "detail=control",
                       "field": lang.Controllable,
                       "description": "",
                       "default": "0",
                       "example": "",
                       "selector": "h_c",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                    {
                       "name": "detail=control_base_url",
                       "field": lang['Custom Base URL'],
                       "description": "",
                       "default": "",
                       "example": "http://111.111.111.111:8080",
                       "form-group-class": "h_c_input h_c_1",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_method",
                       "field": lang['Call Method'],
                       "description": "",
                       "default": "0",
                       "example": "",
                       "selector": "h_control_call",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": `GET (${lang.Default})`,
                              "value": "GET"
                           },
                           {
                              "name": "PUT",
                              "value": "PUT"
                           },
                           {
                              "name": "POST",
                              "value": "POST"
                           },
                           {
                              "name": "ONVIF",
                              "value": "ONVIF"
                           }
                        ]
                    },
                    {
                       "name": "detail=control_digest_auth",
                       "field": lang['Digest Authentication'],
                       "description": "",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                    {
                       "name": "detail=control_stop",
                       "field": lang['Stop Command'],
                       "description": "",
                       "default": "0",
                       "example": "",
                       "selector": "h_cs",
                       "fieldType": "select",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_ONVIF h_control_call_PUT h_control_call_POST",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                    },
                    {
                       "name": "detail=control_url_stop_timeout",
                       "field": lang['URL Stop Timeout'],
                       "description": "",
                       "default": "1000",
                       "example": "",
                       "form-group-class": "h_cs_input h_cs_1",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_center",
                       "field": lang['Center'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_left",
                       "field": lang['Left'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_left_stop",
                       "field": lang['Left Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_right",
                       "field": lang['Right'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_right_stop",
                       "field": lang['Right Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_up",
                       "field": lang['Up'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_up_stop",
                       "field": lang['Up Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_down",
                       "field": lang['Down'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_down_stop",
                       "field": lang['Down Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_enable_nv",
                       "field": lang['Enable Night Vision'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_disable_nv",
                       "field": lang['Disable Night Vision'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_out",
                       "field": lang['Zoom Out'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_out_stop",
                       "field": lang['Zoom Out Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_in",
                       "field": lang['Zoom In'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                    {
                       "name": "detail=control_url_zoom_in_stop",
                       "field": lang['Zoom In Stop'],
                       "description": "",
                       "default": "/",
                       "example": "",
                       "form-group-class-pre-layer": "h_cs_input h_cs_1",
                       "form-group-class": "h_control_call_input h_control_call_GET h_control_call_PUT h_control_call_POST",
                       "possible": ""
                    },
                ]
             },
             "Grouping": {
                id: "monSectionGrouping",
               "name": lang.Grouping,
               "headerTitle": lang['Grouping'] + ' <small>Add groups in <b>Settings</b></small>',
               "color": "purple",
                isSection: true,
                isAdvanced: true,
               "info": [
                   {
                       "fieldType": 'ul',
                       "id": "monitor_groups",
                       "class": "mdl-list"
                   },
                   {
                       hidden: true,
                      "name": "detail=groups",
                   },
               ],
             },
             "Copy Settings": {
                id: "monSectionCopying",
               "name": lang['Copy Settings'],

               "color": "orange",
                isSection: true,
               "info": [
                   {
                      "id": "copy_settings",
                      "field": lang['Copy to Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "selector": "h_copy_settings",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Mode'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="field=mode"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Stream Channels'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="field=detail=stream_channels"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Connection Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionConnection"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Input Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionInput"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Stream Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionStream,#monSectionStreamTimestamp,#monSectionStreamWatermark"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy JPEG API Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionJPEGAPI"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Recording Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionRecording,#monSectionRecordingTimestamp,#monSectionRecordingWatermark"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Detector Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionDetector,#monSectionDetectorBuffer,#monSectionLisencePlateDetector,#monSectionNoMotionDetector"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Custom Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionCustom"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Group Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionGrouping"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Copy Logging Settings'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "attribute": `copy="#monSectionLogging"`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0"
                         },
                         {
                            "name": lang.Yes,
                            "value": "1"
                         }
                      ]
                   },
                   {
                      "field": lang['Monitors to Copy to'],
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                       id: 'copy_settings_monitors',
                      "attribute": `copy="#monSectionLogging" style="min-height:100px" multiple`,
                      "form-group-class": "h_copy_settings_input h_copy_settings_1",
                      "possible": [
                         {
                            "name": lang['New Monitor'],
                            "value": "$New"
                         },
                         {
                            "name": lang['Monitors'],
                            "optgroup": []
                         }
                      ]
                   },
               ],
             },
             "Logging": {
                "name": lang.Logging,
                "color": "green",
                id: "monSectionLogging",
                isAdvanced: true,
                isSection: true,
                "info": [
                   {
                      "name": "detail=loglevel",
                      "field": lang['Log Level'],
                      "description": "The amount of data to provide while doing the job.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                           {
                              "name": lang.Silent,
                              "value": "quiet",
                              "info": "None. This will silence all logging."
                           },
                           {
                              "name": lang.Fatal,
                              "value": "fatal",
                              "info": "Display only fatal errors."
                           },
                           {
                              "name": lang['on Error'],
                              "value": "error",
                              "info": "Display all important errors. Note : this doesn't always show important information."
                           },
                           {
                              "name": lang['All Warnings'],
                              "value": "warning",
                              "info": "Display all warnings. Use this if you can't find out what's wrong with your camera."
                           }
                        ]
                   },
                   {
                      "name": "detail=sqllog",
                      "field": lang["Save Log in SQL"],
                      "description": "Use this with caution as FFMPEG likes to throw up superfluous data at times which can lead to a lot of database rows.",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                         {
                            "name": lang.No,
                            "value": "0",
                            "info": "No is the default."
                         },
                         {
                            "name": lang.Yes,
                            "value": "1",
                            "info": "Do this if you are having recurring issues only."
                         }
                      ]
                  },
                  {
                     "name": "Log Stream",
                     "color": "green",
                      isFormGroupGroup: true,
                     "info": [
                         {
                             "fieldType": 'div',
                             "class": "data-menu logs"
                         },
                     ],
                  },
                ]
            },
             "Hidden": {
                 hidden: true,
                "name": "",
                "color": "",
                isSection: true,
                "info": [
                    {
                       "name": "detail=detector_cascades",
                    },
                    {
                       "name": "detail=stream_channels",
                    },
                    {
                       "name": "detail=input_maps",
                    },
                    {
                       "name": "detail=input_map_choices",
                       "preFill": "{}",
                    },
                    {
                       "name": "details",
                       "preFill": "{}",
                    },
                    {
                       "name": "shto",
                       "preFill": "[]",
                    },
                    {
                       "name": "shfr",
                       "preFill": "[]",
                    },
                ]
             }
          }
       },
       "Account Settings": {
          "section": "Account Settings",
          "blocks": {
             "2-Factor Authentication": {
                 "name": lang['2-Factor Authentication'],
                 "color": "grey",
                 "info": [
                    {
                       "name": "detail=factorAuth",
                       "field": lang.Enabled,
                       "description": "Enable a secondary requirement for login through one of the enabled methods.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                   },
                   {
                       "name": "detail=factor_mail",
                       "field": lang.Email,
                       "description": "Send 2-Factor Authentication codes to the email address of the account.",
                       "default": "1",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ]
                   },
                   {
                       hidden: true,
                       "name": "detail=factor_discord",
                       "field": lang.Discord,
                       "description": "Send 2-Factor Authentication codes to the specified Discord channel.",
                       "default": "1",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                       ],
                       "form-group-class": "u_discord_bot_input u_discord_bot_1"
                    }
                ]
             },
             "Profile": {
                "name": lang.Profile,
                "color": "grey",
                "info": [
                   {
                      "name": "mail",
                      "field": lang.Email,
                      "description": "The login for accounts. The main account holder's email address will get notifications.",
                      "default": "",
                      "example": "ccio@m03.ca",
                      "possible": ""
                   },
                   {
                      "name": "pass",
                      "field": lang.Password,
                      "fieldType": "password",
                      "description": "Leave blank to keep the same password during settings modification.",
                      "fieldType": "password",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "password_again",
                      "field": lang["Password Again"],
                      "fieldType": "password",
                      "description": "Must match Password field if you desire to change it.",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "name": "detail=size",
                      "field": lang["Max Storage Amount"],
                      "description": "The amount of disk space Shinobi will allow to be consumed before purging. This value is read in megabytes.",
                      "default": "10000",
                      "example": "600000",
                      "possible": "Up to 95% of your maximum storage space if only one master account exists.",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_size !== '0'"
                   },
                   {
                      "name": "detail=size_video_percent",
                      "field": lang["Video Share"],
                      "description": "Percent of Max Storage Amount the videos can record to.",
                      "default": "90",
                      "notForSubAccount": true,
                   },
                   {
                      "name": "detail=size_timelapse_percent",
                      "field": lang["Timelapse Frames Share"],
                      "description": "Percent of Max Storage Amount the timelapse frames can record to.",
                      "default": "5",
                      "notForSubAccount": true,
                   },
                   {
                      "name": "detail=size_filebin_percent",
                      "field": lang["FileBin Share"],
                      "description": "Percent of Max Storage Amount the FileBin archive can use.",
                      "default": "5",
                      "notForSubAccount": true,
                   },
                   {
                       hidden:true,
                      "name": "detail=addStorage",
                      "default": "{}",
                      "notForSubAccount": true,
                   },
                   {
                       "fieldType": 'div',
                       "id": "add_storage_max_amounts"
                   },
                   {
                      "name": "detail=days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Videos'],
                      "description": "The number of days to keep videos before purging.",
                      "default": "5",
                      "example": "30",
                      "possible": "",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_days !== '0'"
                   },
                   {
                      "name": "detail=event_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Events'],
                      "description": "The number of days to keep events before purging.",
                      "default": "10",
                      "example": "30",
                      "possible": "",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_event_days !== '0'"
                   },
                   {
                      "name": "detail=log_days",
                      "field": lang["Number of Days to keep"] + ' ' + lang['Logs'],
                      "description": "The number of days to keep logs before purging.",
                      "default": "10",
                      "example": "30",
                      "possible": "",
                      "notForSubAccount": true,
                      "evaluation": "details.edit_log_days !== '0'"
                  },
                  {
                     "name": "detail=lang",
                     "field": lang["Dashboard Language"],
                     "description": 'The primary language of text elements. For complete translation add your language in conf.json e.g:<code>"language": "en_CA",</code>',
                     "default": "en_CA",
                     "example": "",
                     "fieldType": "select",
                     "possible": s.listOfPossibleLanguages
                 },
                 {
                     "name": "detail=audio_note",
                     "field": lang["Notification Sound"],
                     "description": "Sound when information bubble appears.",
                     "default": "",
                     "example": "",
                     "fieldType": "select",
                     "possible": s.listOfAudioFiles
                 },
                 {
                     "name": "detail=audio_alert",
                     "field": lang["Alert Sound"],
                     "description": "Sound when Event occurs.",
                     "default": "",
                     "example": "",
                     "fieldType": "select",
                     "possible": s.listOfAudioFiles
                 },
                 {
                     "name": "detail=audio_delay",
                     "field": lang["Alert Sound Delay"],
                     "description": "Delay until next time an Event can start an Alert. Measured in seconds.",
                     "default": "1",
                     "example": "",
                     "possible": ""
                 },
                 {
                     "name": "detail=event_mon_pop",
                     "field": lang["Popout Monitor on Event"],
                     "description": "When an Event occurs popout the monitor stream.",
                     "default": "en_CA",
                     "example": "",
                     "fieldType": "select",
                     "possible": [
                        {
                           "name": lang.No,
                           "value": "0"
                        },
                        {
                           "name": lang.Yes,
                           "value": "1"
                        }
                     ]
                  }
                ]
             },
             "Monitor Groups": {
                "notForSubAccount": true,
                "name": lang["Monitor Groups"],
                "color": "blue",
                "headerClass": "mon_groups",
                "headerButtons": [
                    {
                        "icon": "plus",
                        "class": "btn-success add"
                    },
                    {
                        "icon": "trash-o",
                        "class": "btn-danger delete"
                    }
                ],
                "info": [
                   {
                      "field": lang["Monitor Groups"],
                      "id":"settings_mon_groups",
                      "description": "",
                      "default": "",
                      "example": "",
                      "fieldType": "select",
                      "possible": []
                   },
                   {
                      "field": lang["Group Name"],
                      "description": "Name of selected group.",
                      "attribute":"group=\"name\"",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "hidden": true,
                      "field": "Group ID",
                      "description": "",
                      "attribute":"group=\"id\"",
                      "default": "",
                      "example": "",
                      "possible": ""
                   },
                   {
                      "hidden": true,
                      "field": "mon_groups",
                      "name": "detail=mon_groups",
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                   }
                ]
             },
             "Uploaders": {
                "name": lang["Uploaders"],
                "color": "forestgreen",
                "blocks": s.uploaderFields
             },
             "Discord Bot": {
                "evaluation": "details.use_discordbot!=='0'",
                "name": lang["Discord Bot"],
                "color": "forestgreen",
                "info": [
                    {
                       "name": "detail=discordbot",
                       "selector":"u_discord_bot",
                       "field": lang.Enabled,
                       "description": "Discord is a messaging service that can provides Bots. The Bots can post messages to a private channel that you have created.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                       "name": "detail=discordbot_token",
                       "fieldType": "password",
                       "placeholder": "XXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXX_XXXXXXXXXXXXXXXXXX",
                       "field": lang.Token,
                       "form-group-class":"u_discord_bot_input u_discord_bot_1",
                       "description": "",
                       "default": "",
                       "example": "",
                       "possible": ""
                   },
                    {
                       "name": "detail=discordbot_channel",
                       "placeholder": "xxxxxxxxxxxxxxxxxx",
                       "field": lang["Channel ID"],
                       "form-group-class":"u_discord_bot_input u_discord_bot_1",
                       "description": "",
                       "default": "",
                       "example": "",
                       "possible": ""
                    }
                ]
             },
             "LDAP": {
                "evaluation":"details.use_ldap!=='0'",
                "name": lang["LDAP"],
                "color": "forestgreen",
                "info": [
                    {
                       "name": "detail=ldap_enable",
                       "selector":"ldap_i",
                       "field": lang.Enabled,
                       "description": "Enable LDAP authentication for this Group.",
                       "default": "0",
                       "example": "",
                       "fieldType": "select",
                       "possible": [
                           {
                              "name": lang.No,
                              "value": "0"
                           },
                           {
                              "name": lang.Yes,
                              "value": "1"
                           }
                       ]
                    },
                    {
                       "form-group-class": "ldap_i_input ldap_i_1",
                       "name": "detail=ldap_url",
                       "field": lang.URL,
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "placeholder":lang.Example + " : cn=admin,dc=test,dc=com",
                       "form-group-class": "ldap_i_input ldap_i_1",
                       "name": "detail=ldap_bindDN",
                       "field": lang.bindDN,
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "form-group-class": "ldap_i_input ldap_i_1",
                       "name": "detail=ldap_bindCredentials",
                       "field": lang['Bind Credentials'],
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "placeholder": "cn={{username}}",
                       "form-group-class": "ldap_i_input ldap_i_1",
                       "name": "detail=ldap_searchFilter",
                       "field": lang['Search Filter'],
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                    {
                       "placeholder": "dc=test,dc=com",
                       "form-group-class": "ldap_i_input ldap_i_1",
                       "name": "detail=ldap_searchBase",
                       "field": lang['Search Base'],
                       "description": "",
                       "example": "",
                       "possible": ""
                    },
                ]
             },
             "Preferences": {
                "name": lang.Preferences,
                "color": "navy",
                "info": [
                   {
                      "name": "detail=css",
                      fieldType:"textarea",
                      "placeholder": "#main_header{background:#b59f00}",
                      "field": lang.CSS,
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                  {
                      "field": lang['Force Monitors Per Row'],
                      "form-group-class":"st_force_mon_rows_input st_force_mon_rows_1",
                      attribute:'localStorage="montage_use"',
                      selector:'st_force_mon_rows',
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                  },
                  {
                      "field": lang['Monitors per row'],
                      "placeholder": "3",
                      attribute:'localStorage="montage"',
                      "description": "",
                      "default": "",
                      "example": "",
                      "possible": ""
                  },
                  {
                      "field": lang['Browser Console Log'],
                      attribute:'localStorage="browserLog"',
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                  },
                  {
                      "field": lang['Get Logs to Client'],
                      attribute:'localStorage="get_server_log"',
                      "description": "",
                      "default": "1",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                  },
                  {
                      "field": lang['Show Thumbnails in Video List'],
                      attribute:'localStorage="showThumbnail"',
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": [
                          {
                             "name": lang.No,
                             "value": "0"
                          },
                          {
                             "name": lang.Yes,
                             "value": "1"
                          }
                      ]
                  },
                  {
                      "field": lang.Themes,
                      "name": "detail=theme",
                      attribute:'localStorage="showThumbnail"',
                      "description": "",
                      "default": "0",
                      "example": "",
                      "fieldType": "select",
                      "possible": s.listOfThemes
                  },
                ]
             }
          }
       }
    }
}
