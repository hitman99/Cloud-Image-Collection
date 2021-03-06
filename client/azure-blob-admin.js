/*****************
 * @preserve
 * Copyright(c) MuscleByte <tomas@musclebyte.com>, 2016
 *****************/

(function(){
    var cloud_image_admin = {
        binary_client: null,
        server_address: 'ws://your.domain.com:1234',
        auth_ok: false,
        buttons_activated: false,
        init: function(){
            //Connect to server
            try {
                var _this = this;
                $('.connection-status').text('Connecting...');
                this.binary_client = new BinaryClient(this.server_address);
                this.binary_client.on('stream', function(stream, meta){
                    stream.on('data', function(data){
                        var feedback = data;
                        if(typeof feedback.auth_status != 'undefined'){
                            if(feedback.auth_status == 'success'){
                                _this.auth_success.call(_this);
                                _this.binary_client.send( {get_pending_blobs : true}, {stream_type : 'list_pending'});
                            }
                            else{
                                _this.auth_failed.call(_this);
                            }
                        }
                    });
                });
                this.binary_client.on('open', function(){
                    var last_status = localStorage.getItem('last_login_status');
                    if(last_status && last_status == 'success'){
                        _this.binary_client.send({
                            user: localStorage.getItem('user'),
                            password: localStorage.getItem('pass')
                        }, {
                            stream_type : 'auth_request'
                        });
                    }
                    else{
                        $('.connection-status').removeClass('error').text('Connected. Please login');
                    }
                });
                this.binary_client.on('close', function(){
                    $('.connection-status')
                        .addClass('error')
                        .text('Cannot connect!');
                });
                var _this = this;
            }
            catch(err){
                console.log(err);
            }
        },
        handleFileUpload : function(event){
            event.stopPropagation();
            event.preventDefault();
            var files = null;
            if(typeof event.target.files != 'undefined')
                files = event.target.files;
            else{
                if(typeof event.dataTransfer.files != 'undefined')
                    files = event.dataTransfer.files;
            }
            if(files.length > 0){
                for (var i = 0; i < files.length; i++) {
                    var stream = this.binary_client.send(files[i], {
                        name: files[i].name,
                        size: files[i].size, 
                        stream_type : 'file_upload',
                        metadata: { title : $('.title-input > input').val() }
                    });
                    var tx = 0;
                    stream.on('data', function(data){
                        if(data.end){
                            $('.notification').removeClass('notification-neutral');
                            $('.notification').addClass('notification-success');
                            setTimeout(function(){
                                $('.notification').removeClass('notification-success');
                                $('.notification').addClass('notification-neutral');
                                $('.notification > h3').text('Click to upload');
                            }, 2000);
                            $('.notification > h3').text('Uploaded');
                            if("vibrate" in navigator){
                                navigator.vibrate(300);
                            }
                            $('.title-input > input').val("");
                        }
                        else{
                            $('.notification > h3').text(Math.round(tx+=data.rx*100) + '%');
                        }
                    });
                    stream.on('error', function(err){
                        if(err.search('Too Large') != -1){
                                $('.notification > h3').text('File is too large!');
                            }
                            else{
                                $('.notification > h3').text('Error: ' + err);
                            }
                            $('.notification').removeClass('notification-neutral');
                            $('.notification').addClass('notification-error');
                    });
                }
            }
        },
        auth : function(){
            var user = $('form > input').eq(0).val();
            var pass = $('form > input').eq(1).val();
            localStorage.setItem('user', user);
            localStorage.setItem('pass', pass);
            if(user.length && pass.length){
                this.binary_client.send({
                    user: user,
                    password: pass
                }, {
                    stream_type : 'auth_request'
                });
            }
        },
        logout : function(){
            var stream = this.binary_client.send({
                user: localStorage.getItem('user')
            }, {
                stream_type : 'logout_request'
            });
            stream.on('data', function(data){
                console.log(data);
                var feedback = data;
                if(typeof feedback.logout_status != 'undefined'){
                    if(feedback.logout_status == 'success'){
                        localStorage.removeItem('user');
                        localStorage.removeItem('pass');
                        localStorage.removeItem('last_login_status');
                        window.location.reload();
                    }
                    else{
                        // Show some notification
                    }
                }
            });
        },
        auth_success : function(){
            localStorage.setItem('last_login_status', 'success');
            this.auth_ok = true;
            $('body').css({ background : 'auto' });
            $('.form').hide();
            $('.choices').show();
        },
        auth_failed : function(){
            this.auth_ok = false;
            localStorage.setItem('last_login_status', 'failure');
            $('.connection-status').addClass('error').text('Login failed. Please try again');
        },
        downloadUrl : function(url){
            if(url.length > 0 && this.buttons_activated){
                var stream = this.binary_client.send(url, {
                                stream_type : 'url_download',
                                metadata: { title : $('.title-input > input').val() }
                            });
                $('.url-grabber > button').text('Downloading...');
                stream.on('data', function(data){
                    if(data.end){
                        $('.url-grabber > button')
                            .text('Done!')
                            .removeClass("red")
                            .addClass("green");  
                        if("vibrate" in navigator){
                            navigator.vibrate(300);
                        }
                        $('.url-grabber > input').val("");
                        $('.title-input > input').val("");
                    }
                    else{
                        $('.url-grabber > button')
                            .text('Failed!')
                            .removeClass("green")
                            .addClass("red"); 
                        if("vibrate" in navigator){
                            navigator.vibrate([300, 300]);
                        }
                    }
                    setTimeout(function(){
                        $('.url-grabber > button')
                            .removeClass("green")
                            .removeClass("red")
                            .text('Grab!');
                    }, 1500);
                });
            }
        },
        toggle_buttons : function(state){
            this.buttons_activated = state;
        }
    };
    $(document).ready(function(){
        cloud_image_admin.init();
        $('.title-input > input').val('');
        $('.title-input > input').change(function(e){
            console.log($(this).val());
            if($(this).val().length > 0){
                cloud_image_admin.toggle_buttons(true);
            }
            else{
                cloud_image_admin.toggle_buttons(false);
            }
        });
        $('.file-input-hidden').change(function(e){
            cloud_image_admin.handleFileUpload(e);
        });
        $('.notification').click(function(){
            if(cloud_image_admin.buttons_activated){
                $('.file-input-hidden').click();
            }
        }); 
        $('.login-button').click(function(event){
            event.stopPropagation();
            event.preventDefault();
            cloud_image_admin.auth.call(cloud_image_admin);
        });
        $('.url-grabber > input').val('');
        $('.url-grabber > button').click(function(){
            cloud_image_admin.downloadUrl($(this).parent().find('input').val());
        });
        $('button.logout').click(function(){
            cloud_image_admin.logout();
        });
    });
})();

