/*****************
 * @preserve
 * Copyright(c) MuscleByte <tomas@musclebyte.com>, 2016
 *****************/

(function(){
    var azure_images = {
        binary_client: null,
        server_address: 'ws://your.domain.com:1234',
        auth_ok: false,
        blobs : null,
        lastLoaded: -1,
        initialLoad: 3,
        lazyLoad: 3,
        facebook_sharer: 'https://www.facebook.com/sharer/sharer.php?u=',
        imageContainer : [
            '<div class="column">',
                '<h3 class="ui dividing header">',
                    '</h3>',
                '<div class="ui basic segment">',
                    '<img class="ui centered image"  src="" style="display: none;"/>',
                    '<div class="ui basic center aligned segment">',
                        '<div class="sk-cube-grid">',
                            '<div class="sk-cube sk-cube1"></div>',
                            '<div class="sk-cube sk-cube2"></div>',
                            '<div class="sk-cube sk-cube3"></div>',
                            '<div class="sk-cube sk-cube4"></div>',
                            '<div class="sk-cube sk-cube5"></div>',
                            '<div class="sk-cube sk-cube6"></div>',
                            '<div class="sk-cube sk-cube7"></div>',
                            '<div class="sk-cube sk-cube8"></div>',
                            '<div class="sk-cube sk-cube9"></div>',
                        '</div>',
                    '</div>',
                '</div>',
                '<div class="ui basic segment">',
                    '<button class="ui facebook icon tiny button">',
                        '<i class="facebook icon"></i>',
                    '</button>',
                    '<button class="ui primary tiny button">',
                        '<i class="share alternate icon"></i>',
                        'Share URL',
                    '</button>',
                    '<button class="ui teal tiny button">',
                        '<i class="share alternate icon"></i>',
                        'Image URL',
                    '</button>',
                '</div>',
            '</div>'].join(''),
        videoContainer : [
            '<div class="column">',
                '<h3 class="ui dividing header">',
                '</h3>',
                '<div class="ui basic segment" style="overflow: hidden;" >',
                    '<video class="ui centered image" autobuffer style="display: none;">',
                        '<source src="" type=""></source>',
                    '</video>',
                    '<div class="ui basic center aligned segment">',
                        '<div class="sk-cube-grid">',
                            '<div class="sk-cube sk-cube1"></div>',
                            '<div class="sk-cube sk-cube2"></div>',
                            '<div class="sk-cube sk-cube3"></div>',
                            '<div class="sk-cube sk-cube4"></div>',
                            '<div class="sk-cube sk-cube5"></div>',
                            '<div class="sk-cube sk-cube6"></div>',
                            '<div class="sk-cube sk-cube7"></div>',
                            '<div class="sk-cube sk-cube8"></div>',
                            '<div class="sk-cube sk-cube9"></div>',
                        '</div>',
                    '</div>',
                    '<div class="ui dimmer">',
                        '<div class="content">',
                            '<div class="center">',
                                '<h2 class="ui inverted icon header" style="cursor: pointer;">',
                                    '<i class="video large play icon"></i>',
                                '</h2>',
                            '</div>',
                        '</div>',
                    '</div>',
                '</div>',
                '<div class="ui basic segment">',
                    '<button class="ui facebook icon tiny button">',
                        '<i class="facebook icon"></i>',
                    '</button>',
                    '<button class="ui primary tiny button">',
                        '<i class="share alternate icon"></i>',
                        'Share URL',
                    '</button>',
                    '<button class="ui teal tiny button">',
                        '<i class="share alternate icon"></i>',
                        'Image URL',
                    '</button>',
                '</div>',
            '</div>'].join(''),
        init: function(){
            //Connect to server
            try {
                var _this = this;
                this.lazyLoadingInit();
                this.binary_client = new BinaryClient(this.server_address);
                this.binary_client.on('stream', function(stream, meta){
                    stream.on('data', function(data){
                        if(typeof data.blobs != 'undefined'){
                            _this.blobs = data.blobs;
                            _this.showImages();
                        }
                    });
                });
                this.binary_client.on('open', function(){
                    _this.binary_client.send({get_blob_list: true}, {
                        stream_type : 'blob_list_retrieval'
                    });
                });
                this.binary_client.on('close', function(){
                });
                var _this = this;
            }
            catch(err){
                console.log(err);
            }
        },
        createImageInDOM : function(item){
            if(item.type.search('video') != -1){
                var $video_node = $('.ui.one.column.grid').append(this.videoContainer).find('video:last');
                $video_node.parent().parent().find('.dividing.header').text(item.title);
                $video_node.find('source')
                    .attr('src', item.url)
                    .attr('type', item.type);
                var $dimmer = null;
                $video_node.get(0).addEventListener('loadeddata', function() {
                    $video_node.next().remove();
                    //$video_node.parent().addClass('dummy-video');
                    $video_node.get(0).currentTime = 0;
                    $video_node.show();
                    $dimmer = $video_node.next().dimmer('show');
                    $dimmer.click(function(){
                        $(this).dimmer('hide');
                        //$video_node.parent().removeClass('dummy-video');
                        $video_node.show().get(0).play();
                    });
                }, false);
                $video_node.click(function(){
                    if($(this).get(0).paused){
                       $(this).get(0).play();
                    }
                    else{
                        $(this).get(0).pause();
                        $dimmer.dimmer('show');
                    }
                });
                $video_node.get(0).addEventListener('ended', function(){
                    $dimmer.dimmer('show');
                }, false);
            }
            else{
                $('.ui.one.column.grid').append(this.imageContainer).find('img:last')
                    .bind('load', function(){
                        $(this).show().next().remove()
                    })
                    .attr('src', item.url)
                    .parent().parent().find('.header').text(item.title);
            }
        },
        lazyLoadingInit : function(){
            var loading = false;
            var _this = this;
            $(window).on( "scroll" , function() {
                var $document = $(document);
                var $window = $(this);
                if( $document.scrollTop() >= $document.height() - $window.height() - 500 ) {
                    if(!loading){
                        loading = true;
                        for(var i = 0; i < _this.lazyLoad; i++){
                            if(++_this.lastLoaded < _this.blobs.length){
                                var item = _this.blobs[_this.lastLoaded];
                                _this.createImageInDOM(item);
                                _this.activateSharingButtons(item.name, item.url);
                            }
                            else{
                                break;
                            }
                        }
                        loading = false;
                    }
                }
            });
        },
        activateSharingButtons : function(name, src){
            var url = window.location.origin + '/share/' + name;
            var _this = this;
            $('.ui.one.column.grid').find('.segment:last').find('button:first').click(function(){
                var win = window.open(_this.facebook_sharer + url, '_blank');
                win.focus();
            });
            $('.ui.one.column.grid').find('.segment:last').find('button:eq(1)').click(function(){
                window.prompt("URL:", url);
            });
            $('.ui.one.column.grid').find('.segment:last').find('button:last').click(function(){
                window.prompt("URL:", src);
            });
        },
        showImages : function(){
            if(this.lastLoaded < 0 ){
                for(var i = 0; i != this.initialLoad; i++){
                    var item = this.blobs[i];
                    this.createImageInDOM(item);
                    this.activateSharingButtons(item.name, item.url);
                }
                this.lastLoaded = 2;
            }
        }
        
    };
    $(document).ready(function(){
        azure_images.init();
    });
})();

