/*___________________________________________________________________________________________________________________________________________________
 _ jquery.mb.components                                                                                                                             _
 _                                                                                                                                                  _
 _ file: jquery.mb.YTPlayer.src.js                                                                                                                  _
 _ last modified: 11/05/17 19.54                                                                                                                    _
 _                                                                                                                                                  _
 _ Open Lab s.r.l., Florence - Italy                                                                                                                _
 _                                                                                                                                                  _
 _ email: matteo@open-lab.com                                                                                                                       _
 _ site: http://pupunzi.com                                                                                                                         _
 _       http://open-lab.com                                                                                                                        _
 _ blog: http://pupunzi.open-lab.com                                                                                                                _
 _ Q&A:  http://jquery.pupunzi.com                                                                                                                  _
 _                                                                                                                                                  _
 _ Licences: MIT, GPL                                                                                                                               _
 _    http://www.opensource.org/licenses/mit-license.php                                                                                            _
 _    http://www.gnu.org/licenses/gpl.html                                                                                                          _
 _                                                                                                                                                  _
 _ Copyright (c) 2001-2017. Matteo Bicocchi (Pupunzi);                                                                                              _
 ___________________________________________________________________________________________________________________________________________________*/
var ytp = ytp || {};

function onYouTubeIframeAPIReady() {
	if( ytp.YTAPIReady ) return;
	ytp.YTAPIReady = true;
	jQuery( document ).trigger( "YTAPIReady" );
}

var getYTPVideoID = function( url ) {
	var videoID, playlistID;
	if( url.indexOf( "youtu.be" ) > 0 ) {
		videoID = url.substr( url.lastIndexOf( "/" ) + 1, url.length );
		playlistID = videoID.indexOf( "?list=" ) > 0 ? videoID.substr( videoID.lastIndexOf( "=" ), videoID.length ) : null;
		videoID = playlistID ? videoID.substr( 0, videoID.lastIndexOf( "?" ) ) : videoID;
	} else if( url.indexOf( "http" ) > -1 ) {
		//videoID = url.match( /([\/&]v\/([^&#]*))|([\\?&]v=([^&#]*))/ )[ 1 ];
		videoID = url.match( /[\\?&]v=([^&#]*)/ )[ 1 ];
		playlistID = url.indexOf( "list=" ) > 0 ? url.match( /[\\?&]list=([^&#]*)/ )[ 1 ] : null;
	} else {
		videoID = url.length > 15 ? null : url;
		playlistID = videoID ? null : url;
	}
	return {
		videoID: videoID,
		playlistID: playlistID
	};
};

( function( jQuery, ytp ) {

	jQuery.mbYTPlayer = {
		name: "jquery.mb.YTPlayer",
		version: "{{ version }}",
		build: "{{ buildnum }}",
		author: "Matteo Bicocchi (pupunzi)",
		apiKey: "",

		/**
		 * Default options for the player
		 */
		defaults: {
			containment: "body", // default containment for the player
			ratio: "auto", // "auto", "16/9", "4/3" or number: 4/3, 16/9
			videoURL: null,
			playlistURL: null, //todo: not yet implemented
			startAt: 0,
			stopAt: 0,
			autoPlay: true,
			vol: 50, // 1 to 100
			addRaster: false,

			/**
			 * Mask:
			 * Accept an object with the time as key and the path of the png mask as value
			 mask:{
                0:'assets/mask-1.png',
                5:'assets/mask-2.png',
                30: false,
                50:'assets/mask-3.png'
            }

			 */
			mask: false,
			opacity: 1,
			quality: "default", //or “small”, “medium”, “large”, “hd720”, “hd1080”, “highres”
			mute: false,
			loop: true,
			fadeOnStartTime: 500, //fade in timing at video start
			showControls: true,
			showAnnotations: false,
			showYTLogo: true,
			stopMovieOnBlur: true,
			realfullscreen: true,
			mobileFallbackImage: null,
			gaTrack: true,
			optimizeDisplay: true,
			remember_last_time: false,
			playOnlyIfVisible: false,
			anchor: "center,center", // top,bottom,left,right combined in pair
			onReady: function( player ) {},
			onError: function( player, err ) {}
		},
		/**
		 *  @fontface icons
		 *  */
		controls: {
			play: "P",
			pause: "p",
			mute: "M",
			unmute: "A",
			onlyYT: "O",
			showSite: "R",
			ytLogo: "Y"
		},
		controlBar: null,
		locationProtocol: "https:",

		/**
		 * Appliable filters
		 */
		filters: {
			grayscale: {
				value: 0,
				unit: "%"
			},
			hue_rotate: {
				value: 0,
				unit: "deg"
			},
			invert: {
				value: 0,
				unit: "%"
			},
			opacity: {
				value: 0,
				unit: "%"
			},
			saturate: {
				value: 0,
				unit: "%"
			},
			sepia: {
				value: 0,
				unit: "%"
			},
			brightness: {
				value: 0,
				unit: "%"
			},
			contrast: {
				value: 0,
				unit: "%"
			},
			blur: {
				value: 0,
				unit: "px"
			}
		},

		/**
		 * buildPlayer
		 *
		 * @param options
		 * @returns [players]
		 */
		buildPlayer: function( options ) {
			return this.each( function() {
				var YTPlayer = this;
				var $YTPlayer = jQuery( YTPlayer );
				YTPlayer.loop = 0;
				YTPlayer.opt = {};
				YTPlayer.state = 0;
				YTPlayer.filters = jQuery.mbYTPlayer.filters;
				YTPlayer.filtersEnabled = true;
				YTPlayer.id = YTPlayer.id || "YTP_" + new Date().getTime();
				$YTPlayer.addClass( "mb_YTPlayer" );

				var property = $YTPlayer.data( "property" ) && typeof $YTPlayer.data( "property" ) == "string" ? eval( '(' + $YTPlayer.data( "property" ) + ')' ) : $YTPlayer.data( "property" );

				if( typeof property != "undefined" && typeof property.vol != "undefined" ) {
					if( property.vol === 0 ) {
						property.vol = 1;
						property.mute = true;
					}
				}

				jQuery.extend( YTPlayer.opt, jQuery.mbYTPlayer.defaults, options, property );

				if( YTPlayer.opt.loop == "true" )
					YTPlayer.opt.loop = 9999;

				YTPlayer.isRetina = ( window.retina || window.devicePixelRatio > 1 );
				var isIframe = function() {
					var isIfr = false;
					try {
						if( self.location.href != top.location.href ) isIfr = true;
					} catch( e ) {
						isIfr = true;
					}
					return isIfr;
				};

				/**
				 * Disable fullScreen if is in an iframe
				 * @type {boolean}
				 */
				YTPlayer.opt.realfullscreen = isIframe() ? false : YTPlayer.opt.realfullscreen;

				if( !$YTPlayer.attr( "id" ) )
					$YTPlayer.attr( "id", "ytp_" + new Date().getTime() );

				var playerID = "iframe_" + YTPlayer.id;
				YTPlayer.isAlone = false;
				YTPlayer.hasFocus = true;
				YTPlayer.videoID = this.opt.videoURL ? getYTPVideoID( this.opt.videoURL ).videoID : $YTPlayer.attr( "href" ) ? getYTPVideoID( $YTPlayer.attr( "href" ) ).videoID : false;
				YTPlayer.playlistID = this.opt.videoURL ? getYTPVideoID( this.opt.videoURL ).playlistID : $YTPlayer.attr( "href" ) ? getYTPVideoID( $YTPlayer.attr( "href" ) ).playlistID : false;

				YTPlayer.opt.showAnnotations = YTPlayer.opt.showAnnotations ? '1' : '3';

				var start_from_last = 0;

				if( jQuery.mbCookie.get( "YTPlayer_start_from" + YTPlayer.videoID ) )
					start_from_last = parseFloat( jQuery.mbCookie.get( "YTPlayer_start_from" + YTPlayer.videoID ) );

				if( YTPlayer.opt.remember_last_time && start_from_last ) {
					YTPlayer.start_from_last = start_from_last;
					jQuery.mbCookie.remove( "YTPlayer_start_from" + YTPlayer.videoID );
				}

				//todo: check if the player can run on mobile device testing 'playsInline' property
				//YTPlayer.canPlayOnMobile = jQuery.mbBrowser.mobile && ( 'playsInline' in document.createElement( 'video' ) );
				YTPlayer.canPlayOnMobile = jQuery.mbBrowser.mobile;

				/**
				 * Youtube player variables
				 * @type {{modestbranding: number, autoplay: number, controls: number, showinfo: number, rel: number, enablejsapi: number, version: number, playerapiid: string, origin: string, allowfullscreen: boolean, iv_load_policy: (string|*|jQuery.mbYTPlayer.opt.showAnnotations), playsinline: number}}
				 */
				var playerVars = {
					'modestbranding': 1,
					'autoplay': 0,
					'controls': 0,
					'showinfo': 0,
					'rel': 0,
					'enablejsapi': 1,
					'version': 3,
					'playerapiid': playerID,
					'origin': '*',
					'allowfullscreen': true,
					'wmode': 'transparent',
					'iv_load_policy': YTPlayer.opt.showAnnotations,
					'playsinline': jQuery.browser.mobile ? 1 : 0
				};

				if( document.createElement( 'video' ).canPlayType ) jQuery.extend( playerVars, {
					'html5': 1
				} );

				if( jQuery.mbBrowser.msie && jQuery.mbBrowser.version < 9 )
					this.opt.opacity = 1;

				YTPlayer.isPlayer = YTPlayer.opt.containment == "self";
				YTPlayer.opt.containment = YTPlayer.opt.containment == "self" ? jQuery( this ) : jQuery( YTPlayer.opt.containment );
				YTPlayer.isBackground = YTPlayer.opt.containment.is( "body" );

				if( YTPlayer.isPlayer ) {

					YTPlayer.inlineWrapper = jQuery( "<div/>" ).addClass( "inline-YTPlayer" );

					YTPlayer.inlineWrapper.css( {
						position: "relative",
						maxWidth: YTPlayer.opt.containment.css( "width" )
					} );

					YTPlayer.opt.containment.width( "100%" );

					YTPlayer.opt.containment.wrap( YTPlayer.inlineWrapper );

					YTPlayer.opt.containment.css( {
						position: "relative",
						paddingBottom: "56.25%",
						overflow: "hidden",
						height: 0
					} );
				}

				if( YTPlayer.isBackground && ytp.backgroundIsInited )
					return;

				// If on mobile and can play on mobile remove controls
				// todo: adapt controls to mobile
				if( YTPlayer.canPlayOnMobile && YTPlayer.isBackground ) {
					YTPlayer.opt.showControls = false;
				}

				/**
				 * Hide the placeholder if it's not the target of the player
				 */

				if( !YTPlayer.isPlayer ) {
					$YTPlayer.hide();
				}

				YTPlayer.overlay = jQuery( "<div/>" ).css( {
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%"
				} ).addClass( "YTPOverlay" );

				if( YTPlayer.isPlayer ) {
					YTPlayer.overlay.on( "click", function() {
						$YTPlayer.YTPTogglePlay();
					} )
				}

				YTPlayer.wrapper = jQuery( "<div/>" ).addClass( "mbYTP_wrapper" ).attr( "id", "wrapper_" + YTPlayer.id );

				YTPlayer.wrapper.css( {
					position: "absolute",
					zIndex: 0,
					minWidth: "100%",
					minHeight: "100%",
					left: 0,
					top: 0,
					overflow: "hidden",
					opacity: 0
				} );

				var playerBox = jQuery( "<div/>" ).attr( "id", playerID ).addClass( "playerBox" );

				playerBox.css( {
					position: "absolute",
					zIndex: 0,
					width: "100%",
					height: "100%",
					top: 0,
					left: 0,
					overflow: "hidden"
				} );

				YTPlayer.wrapper.append( playerBox );

				playerBox.css( {
					opacity: 1
				} );

				playerBox.after( YTPlayer.overlay );

				/**
				 * Loop all the elements inside the container and check if their position is not "static"
				 */
				YTPlayer.opt.containment.children().not( "script, style" ).each( function() {

					if( jQuery( this ).css( "position" ) == "static" )
						jQuery( this ).css( "position", "relative" );

				} );

				if( YTPlayer.isBackground ) {
					jQuery( "body" ).css( {
						boxSizing: "border-box"
					} );

					YTPlayer.wrapper.css( {
						position: "fixed",
						top: 0,
						left: 0,
						zIndex: 0
					} );

					$YTPlayer.hide();

				} else if( YTPlayer.opt.containment.css( "position" ) == "static" )
					YTPlayer.opt.containment.css( {
						position: "relative"
					} );

				YTPlayer.opt.containment.prepend( YTPlayer.wrapper );

				if( !YTPlayer.isBackground ) {
					YTPlayer.overlay.on( "mouseenter", function() {
						if( YTPlayer.controlBar && YTPlayer.controlBar.length )
							YTPlayer.controlBar.addClass( "visible" );
					} ).on( "mouseleave", function() {
						if( YTPlayer.controlBar && YTPlayer.controlBar.length )
							YTPlayer.controlBar.removeClass( "visible" );
					} );
				}

				if( !ytp.YTAPIReady ) {

					jQuery( "#YTAPI" ).remove();
					var tag = jQuery( "<script></script>" ).attr( {
						"src": jQuery.mbYTPlayer.locationProtocol + "//www.youtube.com/iframe_api?v=" + jQuery.mbYTPlayer.version,
						"id": "YTAPI"
					} );
					jQuery( "head" ).prepend( tag );

				} else {

					setTimeout( function() {
						jQuery( document ).trigger( "YTAPIReady" );
					}, 100 );

					if( jQuery.mbBrowser.mobile && YTPlayer.canPlayOnMobile )
						jQuery( "body" ).one( "touchstart", function() {
							YTPlayer.player.playVideo();
						} );

				}

				if( jQuery.mbBrowser.mobile && !YTPlayer.canPlayOnMobile ) {
					if( YTPlayer.opt.mobileFallbackImage ) {
						YTPlayer.wrapper.css( {
							backgroundImage: "url(" + YTPlayer.opt.mobileFallbackImage + ")",
							backgroundPosition: "center center",
							backgroundSize: "cover",
							backgroundRepeat: "no-repeat",
							opacity: 1
						} )
					};

					if( !YTPlayer.isPlayer )
						$YTPlayer.remove();

					jQuery( document ).trigger( "YTPUnavailable" );

					return;
				}

				jQuery( document ).on( "YTAPIReady", function() {
					if( ( YTPlayer.isBackground && ytp.backgroundIsInited ) || YTPlayer.isInit ) return;
					if( YTPlayer.isBackground ) {
						ytp.backgroundIsInited = true;
					}

					YTPlayer.opt.autoPlay = typeof YTPlayer.opt.autoPlay == "undefined" ? ( YTPlayer.isBackground ? true : false ) : YTPlayer.opt.autoPlay;
					YTPlayer.opt.vol = YTPlayer.opt.vol ? YTPlayer.opt.vol : 100;

					jQuery.mbYTPlayer.getDataFromAPI( YTPlayer );

					jQuery( YTPlayer ).on( "YTPChanged", function() {

						if( YTPlayer.isInit )
							return;

						YTPlayer.isInit = true;

						new YT.Player( playerID, {
							videoId: YTPlayer.videoID.toString(),
							playerVars: playerVars,
							events: {
								'onReady': function( event ) {
									YTPlayer.player = event.target;

									if( YTPlayer.isReady )
										return;

									YTPlayer.isReady = YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ? false : true;
									YTPlayer.playerEl = YTPlayer.player.getIframe();

									jQuery( YTPlayer.playerEl ).unselectable();

									$YTPlayer.optimizeDisplay();
									jQuery( window ).off( "resize.YTP_" + YTPlayer.id ).on( "resize.YTP_" + YTPlayer.id, function() {
										$YTPlayer.optimizeDisplay();
									} );

									if( YTPlayer.opt.remember_last_time ) {

										jQuery( window ).on( "unload.YTP_" + YTPlayer.id, function() {
											var current_time = YTPlayer.player.getCurrentTime();

											jQuery.mbCookie.set( "YTPlayer_start_from" + YTPlayer.videoID, current_time, 0 );
										} );

									}

									jQuery.mbYTPlayer.checkForState( YTPlayer );
								},
								/**
								 * on State Change
								 * @param event
								 *
								 * -1 (unstarted)
								 * 0 (ended)
								 * 1 (playing)
								 * 2 (paused)
								 * 3 (buffering)
								 * 5 (video cued).
								 */
								'onStateChange': function( event ) {
									if( typeof event.target.getPlayerState != "function" ) return;
									var state = event.target.getPlayerState();

									if( YTPlayer.preventTrigger ) {
										YTPlayer.preventTrigger = false;
										return
									}

									YTPlayer.state = state;

									var eventType;
									switch( state ) {
										case -1: //----------------------------------------------- unstarted
											eventType = "YTPUnstarted";
											break;
										case 0: //------------------------------------------------ ended
											eventType = "YTPRealEnd";
											break;
										case 1: //------------------------------------------------ play
											eventType = "YTPPlay";
											if( YTPlayer.controlBar.length )
												YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.pause );
											if( typeof _gaq != "undefined" && eval( YTPlayer.opt.gaTrack ) ) _gaq.push( [ '_trackEvent', 'YTPlayer', 'Play', ( YTPlayer.hasData ? YTPlayer.videoData.title : YTPlayer.videoID.toString() ) ] );
											if( typeof ga != "undefined" && eval( YTPlayer.opt.gaTrack ) ) ga( 'send', 'event', 'YTPlayer', 'play', ( YTPlayer.hasData ? YTPlayer.videoData.title : YTPlayer.videoID.toString() ) );
											break;
										case 2: //------------------------------------------------ pause
											eventType = "YTPPause";
											if( YTPlayer.controlBar.length )
												YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );
											break;
										case 3: //------------------------------------------------ buffer
											YTPlayer.player.setPlaybackQuality( YTPlayer.opt.quality );
											eventType = "YTPBuffering";
											if( YTPlayer.controlBar.length )
												YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );
											break;
										case 5: //------------------------------------------------ cued
											eventType = "YTPCued";
											break;
										default:
											break;
									}

									// Trigger state events
									var YTPEvent = jQuery.Event( eventType );
									YTPEvent.time = YTPlayer.currentTime;
									if( !YTPlayer.preventTrigger )
										jQuery( YTPlayer ).trigger( YTPEvent );
								},
								/**
								 * onPlaybackQualityChange
								 * @param e
								 */
								'onPlaybackQualityChange': function( e ) {
									var quality = e.target.getPlaybackQuality();
									var YTPQualityChange = jQuery.Event( "YTPQualityChange" );
									YTPQualityChange.quality = quality;
									jQuery( YTPlayer ).trigger( YTPQualityChange );
								},
								/**
								 * onError
								 * @param err
								 */
								'onError': function( err ) {

									if( err.data == 150 ) {
										console.log( "Embedding this video is restricted by Youtube." );
										if( YTPlayer.isPlayList )
											jQuery( YTPlayer ).playNext();
									}

									if( err.data == 2 && YTPlayer.isPlayList ) {
										jQuery( YTPlayer ).playNext();
									}

									if( typeof YTPlayer.opt.onError == "function" )
										YTPlayer.opt.onError( $YTPlayer, err );
								}
							}
						} );
					} );
				} );

				$YTPlayer.off( "YTPTime.mask" );

				jQuery.mbYTPlayer.applyMask( YTPlayer );

			} );
		},

		/**
		 * isOnScreen
		 * Check if the YTPlayer is on screen
		 * @param YTPlayer
		 * @returns {boolean}
		 */
		isOnScreen: function( YTPlayer ) {

			var playerBox = YTPlayer.wrapper;

			var winTop = $( window ).scrollTop();
			var winBottom = winTop + $( window ).height();
			var elTop = playerBox.offset().top;
			var elBottom = elTop + playerBox.height() / 2;
			return( ( elBottom <= winBottom ) && ( elTop >= winTop ) );

		},

		/**
		 * getDataFromAPI
		 * @param YTPlayer
		 */
		getDataFromAPI: function( YTPlayer ) {
			YTPlayer.videoData = jQuery.mbStorage.get( "YTPlayer_data_" + YTPlayer.videoID );
			jQuery( YTPlayer ).off( "YTPData.YTPlayer" ).on( "YTPData.YTPlayer", function() {
				if( YTPlayer.hasData ) {

					if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ) {
						var bgndURL = YTPlayer.videoData.thumb_max || YTPlayer.videoData.thumb_high || YTPlayer.videoData.thumb_medium;

						YTPlayer.opt.containment.css( {
							background: "rgba(0,0,0,0.5) url(" + bgndURL + ") center center",
							backgroundSize: "cover"
						} );
						YTPlayer.opt.backgroundUrl = bgndURL;
					}
				}
			} );

			if( YTPlayer.videoData ) {

				setTimeout( function() {
					YTPlayer.opt.ratio = YTPlayer.opt.ratio == "auto" ? 16 / 9 : YTPlayer.opt.ratio;
					YTPlayer.dataReceived = true;

					var YTPChanged = jQuery.Event( "YTPChanged" );
					YTPChanged.time = YTPlayer.currentTime;
					YTPChanged.videoId = YTPlayer.videoID;
					jQuery( YTPlayer ).trigger( YTPChanged );

					var YTPData = jQuery.Event( "YTPData" );
					YTPData.prop = {};
					for( var x in YTPlayer.videoData )
						YTPData.prop[ x ] = YTPlayer.videoData[ x ];
					jQuery( YTPlayer ).trigger( YTPData );

				}, YTPlayer.opt.fadeOnStartTime );

				YTPlayer.hasData = true;
			} else if( jQuery.mbYTPlayer.apiKey ) {

				// Get video info from API3 (needs api key)
				// snippet,player,contentDetails,statistics,status

				jQuery.getJSON( jQuery.mbYTPlayer.locationProtocol + "//www.googleapis.com/youtube/v3/videos?id=" + YTPlayer.videoID + "&key=" + jQuery.mbYTPlayer.apiKey + "&part=snippet", function( data ) {
					YTPlayer.dataReceived = true;

					var YTPChanged = jQuery.Event( "YTPChanged" );
					YTPChanged.time = YTPlayer.currentTime;
					YTPChanged.videoId = YTPlayer.videoID;
					jQuery( YTPlayer ).trigger( YTPChanged );

					function parseYTPlayer_data( data ) {
						YTPlayer.videoData = {};
						YTPlayer.videoData.id = YTPlayer.videoID;
						YTPlayer.videoData.channelTitle = data.channelTitle;
						YTPlayer.videoData.title = data.title;
						YTPlayer.videoData.description = data.description.length < 400 ? data.description : data.description.substring( 0, 400 ) + " ...";
						YTPlayer.videoData.aspectratio = YTPlayer.opt.ratio == "auto" ? 16 / 9 : YTPlayer.opt.ratio;
						YTPlayer.opt.ratio = YTPlayer.videoData.aspectratio;
						YTPlayer.videoData.thumb_max = data.thumbnails.maxres ? data.thumbnails.maxres.url : null;
						YTPlayer.videoData.thumb_high = data.thumbnails.high ? data.thumbnails.high.url : null;
						YTPlayer.videoData.thumb_medium = data.thumbnails.medium ? data.thumbnails.medium.url : null;
						jQuery.mbStorage.set( "YTPlayer_data_" + YTPlayer.videoID, YTPlayer.videoData );
					}

					parseYTPlayer_data( data.items[ 0 ].snippet );
					YTPlayer.hasData = true;
					var YTPData = jQuery.Event( "YTPData" );
					YTPData.prop = {};
					for( var x in YTPlayer.videoData ) YTPData.prop[ x ] = YTPlayer.videoData[ x ];
					jQuery( YTPlayer ).trigger( YTPData );
				} );

			} else {

				setTimeout( function() {
					var YTPChanged = jQuery.Event( "YTPChanged" );
					YTPChanged.time = YTPlayer.currentTime;
					YTPChanged.videoId = YTPlayer.videoID;
					jQuery( YTPlayer ).trigger( YTPChanged );

				}, 50 );
				if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ) {
					var bgndURL = jQuery.mbYTPlayer.locationProtocol + "//i.ytimg.com/vi/" + YTPlayer.videoID + "/maxresdefault.jpg";

					if( bgndURL )
						YTPlayer.opt.containment.css( {
							background: "rgba(0,0,0,0.5) url(" + bgndURL + ") center center",
							backgroundSize: "cover"
						} );
					YTPlayer.opt.backgroundUrl = bgndURL;
				}

				YTPlayer.videoData = null;
				YTPlayer.opt.ratio = YTPlayer.opt.ratio == "auto" ? "16/9" : YTPlayer.opt.ratio;

			}

			if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay ) { //&& ( !jQuery.mbBrowser.mobile && !jQuery.isTablet )
				YTPlayer.loading = jQuery( "<div/>" ).addClass( "loading" ).html( "Loading" ).hide();
				jQuery( YTPlayer ).append( YTPlayer.loading );
				YTPlayer.loading.fadeIn();
			}
		},

		/**
		 * removeStoredData
		 */
		removeStoredData: function() {
			jQuery.mbStorage.remove();
		},

		/**
		 * getVideoData
		 * @returns {*|YTPlayer.videoData}
		 */
		getVideoData: function() {
			var YTPlayer = this.get( 0 );
			return YTPlayer.videoData;
		},

		/**
		 * getVideoID
		 * @returns {*|YTPlayer.videoID|boolean}
		 */
		getVideoID: function() {
			var YTPlayer = this.get( 0 );
			return YTPlayer.videoID || false;
		},
		/**
		 * setVideoQuality
		 * @param quality
		 */
		setVideoQuality: function( quality ) {
			var YTPlayer = this.get( 0 );
			YTPlayer.player.setPlaybackQuality( quality );
		},

		/**
		 * playlist
		 * @param videos
		 * @param shuffle
		 * @param callback
		 * @returns {jQuery.mbYTPlayer}
		 */
		playlist: function( videos, shuffle, callback ) {
			var $YTPlayer = this;
			var YTPlayer = $YTPlayer.get( 0 );
			YTPlayer.isPlayList = true;
			if( shuffle ) videos = jQuery.shuffle( videos );
			if( !YTPlayer.videoID ) {
				YTPlayer.videos = videos;
				YTPlayer.videoCounter = 0;
				YTPlayer.videoLength = videos.length;
				jQuery( YTPlayer ).data( "property", videos[ 0 ] );
				jQuery( YTPlayer ).mb_YTPlayer();
			}

			if( typeof callback == "function" )
				jQuery( YTPlayer ).one( "YTPChanged", function() {
					callback( YTPlayer );
				} );

			jQuery( YTPlayer ).on( "YTPEnd", function() {
				jQuery( YTPlayer ).playNext();
			} );
			return this;
		},

		/**
		 * playNext
		 * @returns {jQuery.mbYTPlayer}
		 */
		playNext: function() {
			var YTPlayer = this.get( 0 );

			if( YTPlayer.checkForStartAt ) {
				clearInterval( YTPlayer.checkForStartAt );
				clearInterval( YTPlayer.getState );
			}

			YTPlayer.videoCounter++;

			if( YTPlayer.videoCounter >= YTPlayer.videoLength )
				YTPlayer.videoCounter = 0;

			jQuery( YTPlayer ).YTPChangeMovie( YTPlayer.videos[ YTPlayer.videoCounter ] );

			return this;
		},

		/**
		 * playPrev
		 * @returns {jQuery.mbYTPlayer}
		 */
		playPrev: function() {
			var YTPlayer = this.get( 0 );

			if( YTPlayer.checkForStartAt ) {
				clearInterval( YTPlayer.checkForStartAt );
				clearInterval( YTPlayer.getState );
			}

			YTPlayer.videoCounter--;

			if( YTPlayer.videoCounter < 0 )
				YTPlayer.videoCounter = YTPlayer.videoLength - 1;

			jQuery( YTPlayer ).YTPChangeMovie( YTPlayer.videos[ YTPlayer.videoCounter ] );

			return this;
		},

		/**
		 * playIndex
		 * @returns {jQuery.mbYTPlayer}
		 */
		playIndex: function( idx ) {
			var YTPlayer = this.get( 0 );

			idx = idx - 1;

			if( YTPlayer.checkForStartAt ) {
				clearInterval( YTPlayer.checkForStartAt );
				clearInterval( YTPlayer.getState );
			}

			YTPlayer.videoCounter = idx;
			if( YTPlayer.videoCounter >= YTPlayer.videoLength - 1 )
				YTPlayer.videoCounter = YTPlayer.videoLength - 1;
			jQuery( YTPlayer ).YTPChangeMovie( YTPlayer.videos[ YTPlayer.videoCounter ] );
			return this;
		},

		/**
		 * changeMovie
		 * @param opt
		 */
		changeMovie: function( opt ) {

			var $YTPlayer = this;
			var YTPlayer = $YTPlayer.get( 0 );
			YTPlayer.opt.startAt = 0;
			YTPlayer.opt.stopAt = 0;
			YTPlayer.opt.mask = false;
			YTPlayer.opt.mute = true;
			YTPlayer.hasData = false;
			YTPlayer.hasChanged = true;
			YTPlayer.player.loopTime = undefined;

			if( opt )
				jQuery.extend( YTPlayer.opt, opt );

			YTPlayer.videoID = getYTPVideoID( YTPlayer.opt.videoURL ).videoID;

			if( YTPlayer.opt.loop == "true" )
				YTPlayer.opt.loop = 9999;

			jQuery( YTPlayer.playerEl ).CSSAnimate( {
				opacity: 0
			}, YTPlayer.opt.fadeOnStartTime, function() {

				var YTPChangeMovie = jQuery.Event( "YTPChangeMovie" );
				YTPChangeMovie.time = YTPlayer.currentTime;
				YTPChangeMovie.videoId = YTPlayer.videoID;
				jQuery( YTPlayer ).trigger( YTPChangeMovie );

				jQuery( YTPlayer ).YTPGetPlayer().cueVideoByUrl( encodeURI( jQuery.mbYTPlayer.locationProtocol + "//www.youtube.com/v/" + YTPlayer.videoID ), 1, YTPlayer.opt.quality );
				jQuery( YTPlayer ).optimizeDisplay();

				jQuery.mbYTPlayer.checkForState( YTPlayer );
				jQuery.mbYTPlayer.getDataFromAPI( YTPlayer );

			} );

			jQuery.mbYTPlayer.applyMask( YTPlayer );
		},

		/**
		 * getPlayer
		 * @returns {player}
		 */
		getPlayer: function() {
			return jQuery( this ).get( 0 ).player;
		},

		/**
		 * playerDestroy
		 * @returns {jQuery.mbYTPlayer}
		 */
		playerDestroy: function() {
			var YTPlayer = this.get( 0 );
			ytp.YTAPIReady = true;
			ytp.backgroundIsInited = false;
			YTPlayer.isInit = false;
			YTPlayer.videoID = null;
			YTPlayer.isReady = false;
			YTPlayer.wrapper.remove();
			jQuery( "#controlBar_" + YTPlayer.id ).remove();
			clearInterval( YTPlayer.checkForStartAt );
			clearInterval( YTPlayer.getState );
			return this;
		},

		/**
		 * fullscreen
		 * @param real
		 * @returns {jQuery.mbYTPlayer}
		 */
		fullscreen: function( real ) {
			var YTPlayer = this.get( 0 );
			if( typeof real == "undefined" ) real = YTPlayer.opt.realfullscreen;
			real = eval( real );
			var controls = jQuery( "#controlBar_" + YTPlayer.id );
			var fullScreenBtn = controls.find( ".mb_OnlyYT" );
			var videoWrapper = YTPlayer.isPlayer ? YTPlayer.opt.containment : YTPlayer.wrapper;

			if( real ) {
				var fullscreenchange = jQuery.mbBrowser.mozilla ? "mozfullscreenchange" : jQuery.mbBrowser.webkit ? "webkitfullscreenchange" : "fullscreenchange";
				jQuery( document ).off( fullscreenchange ).on( fullscreenchange, function() {
					var isFullScreen = RunPrefixMethod( document, "IsFullScreen" ) || RunPrefixMethod( document, "FullScreen" );
					if( !isFullScreen ) {
						YTPlayer.isAlone = false;
						fullScreenBtn.html( jQuery.mbYTPlayer.controls.onlyYT );
						jQuery( YTPlayer ).YTPSetVideoQuality( YTPlayer.opt.quality );
						videoWrapper.removeClass( "YTPFullscreen" );

						videoWrapper.CSSAnimate( {
							opacity: YTPlayer.opt.opacity
						}, YTPlayer.opt.fadeOnStartTime );

						videoWrapper.css( {
							zIndex: 0
						} );

						if( YTPlayer.isBackground ) {
							jQuery( "body" ).after( controls );
						} else {
							YTPlayer.wrapper.before( controls );
						}
						jQuery( window ).resize();
						jQuery( YTPlayer ).trigger( "YTPFullScreenEnd" );
					} else {
						jQuery( YTPlayer ).YTPSetVideoQuality( "default" );
						jQuery( YTPlayer ).trigger( "YTPFullScreenStart" );
					}
				} );
			}
			if( !YTPlayer.isAlone ) {
				function hideMouse() {
					YTPlayer.overlay.css( {
						cursor: "none"
					} );
				}

				jQuery( document ).on( "mousemove.YTPlayer", function( e ) {
					YTPlayer.overlay.css( {
						cursor: "auto"
					} );
					clearTimeout( YTPlayer.hideCursor );
					if( !jQuery( e.target ).parents().is( ".mb_YTPBar" ) ) YTPlayer.hideCursor = setTimeout( hideMouse, 3000 );
				} );

				hideMouse();

				if( real ) {
					videoWrapper.css( {
						opacity: 0
					} );
					videoWrapper.addClass( "YTPFullscreen" );
					launchFullscreen( videoWrapper.get( 0 ) );

					setTimeout( function() {

						videoWrapper.CSSAnimate( {
							opacity: 1
						}, YTPlayer.opt.fadeOnStartTime * 2 );

						YTPlayer.wrapper.append( controls );
						jQuery( YTPlayer ).optimizeDisplay();
						YTPlayer.player.seekTo( YTPlayer.player.getCurrentTime() + .1, true );

					}, YTPlayer.opt.fadeOnStartTime )
				} else videoWrapper.css( {
					zIndex: 10000
				} ).CSSAnimate( {
					opacity: 1
				}, YTPlayer.opt.fadeOnStartTime * 2 );
				fullScreenBtn.html( jQuery.mbYTPlayer.controls.showSite );
				YTPlayer.isAlone = true;
			} else {
				jQuery( document ).off( "mousemove.YTPlayer" );
				clearTimeout( YTPlayer.hideCursor );
				YTPlayer.overlay.css( {
					cursor: "auto"
				} );
				if( real ) {
					cancelFullscreen();
				} else {
					videoWrapper.CSSAnimate( {
						opacity: YTPlayer.opt.opacity
					}, YTPlayer.opt.fadeOnStartTime );
					videoWrapper.css( {
						zIndex: 0
					} );
				}
				fullScreenBtn.html( jQuery.mbYTPlayer.controls.onlyYT );
				YTPlayer.isAlone = false;
			}

			function RunPrefixMethod( obj, method ) {
				var pfx = [ "webkit", "moz", "ms", "o", "" ];
				var p = 0,
					m, t;
				while( p < pfx.length && !obj[ m ] ) {
					m = method;
					if( pfx[ p ] == "" ) {
						m = m.substr( 0, 1 ).toLowerCase() + m.substr( 1 );
					}
					m = pfx[ p ] + m;
					t = typeof obj[ m ];
					if( t != "undefined" ) {
						pfx = [ pfx[ p ] ];
						return( t == "function" ? obj[ m ]() : obj[ m ] );
					}
					p++;
				}
			}

			function launchFullscreen( element ) {
				RunPrefixMethod( element, "RequestFullScreen" );
			}

			function cancelFullscreen() {
				if( RunPrefixMethod( document, "FullScreen" ) || RunPrefixMethod( document, "IsFullScreen" ) ) {
					RunPrefixMethod( document, "CancelFullScreen" );
				}
			}

			return this;
		},

		/**
		 * toggleLoops
		 * @returns {jQuery.mbYTPlayer}
		 */
		toggleLoops: function() {
			var YTPlayer = this.get( 0 );
			var data = YTPlayer.opt;
			if( data.loop == 1 ) {
				data.loop = 0;
			} else {
				if( data.startAt ) {
					YTPlayer.player.seekTo( data.startAt );
				} else {
					YTPlayer.player.playVideo();
				}
				data.loop = 1;
			}
			return this;
		},

		/**
		 * play
		 * @returns {jQuery.mbYTPlayer}
		 */
		play: function() {
			var YTPlayer = this.get( 0 );
			if( !YTPlayer.isReady )
				return this;

			YTPlayer.player.playVideo();

			if( !YTPlayer.wrapper.is( ":visible" ) )
				YTPlayer.wrapper.CSSAnimate( {
					opacity: YTPlayer.isAlone ? 1 : YTPlayer.opt.opacity
				}, YTPlayer.opt.fadeOnStartTime );

			if( !jQuery( YTPlayer.playerEl ).is( ":visible" ) )
				jQuery( YTPlayer.playerEl ).CSSAnimate( {
					opacity: 1
				}, YTPlayer.opt.fadeOnStartTime * 2 );

			var controls = jQuery( "#controlBar_" + YTPlayer.id );
			var playBtn = controls.find( ".mb_YTPPlaypause" );
			playBtn.html( jQuery.mbYTPlayer.controls.pause );
			YTPlayer.state = 1;
			YTPlayer.orig_background = jQuery( YTPlayer ).css( "background-image" );

			return this;
		},

		/**
		 * togglePlay
		 * @param callback
		 * @returns {jQuery.mbYTPlayer}
		 */
		togglePlay: function( callback ) {
			var YTPlayer = this.get( 0 );
			if( YTPlayer.state == 1 )
				this.YTPPause();
			else
				this.YTPPlay();

			if( typeof callback == "function" )
				callback( YTPlayer.state );

			return this;
		},

		/**
		 * stop
		 * @returns {jQuery.mbYTPlayer}
		 */
		stop: function() {
			var YTPlayer = this.get( 0 );
			var controls = jQuery( "#controlBar_" + YTPlayer.id );
			var playBtn = controls.find( ".mb_YTPPlaypause" );
			playBtn.html( jQuery.mbYTPlayer.controls.play );
			YTPlayer.player.stopVideo();
			return this;
		},

		/**
		 * pause
		 * @returns {jQuery.mbYTPlayer}
		 */
		pause: function() {
			var YTPlayer = this.get( 0 );
			YTPlayer.player.pauseVideo();
			YTPlayer.state = 2;
			return this;
		},

		/**
		 * seekTo
		 * @param val
		 * @returns {jQuery.mbYTPlayer}
		 */
		seekTo: function( val ) {
			var YTPlayer = this.get( 0 );
			YTPlayer.player.seekTo( val, true );
			return this;
		},

		/**
		 * setVolume
		 * @param val
		 * @returns {jQuery.mbYTPlayer}
		 */
		setVolume: function( val ) {
			var YTPlayer = this.get( 0 );

			if( !YTPlayer.player.length )
				return;

			if( !val && !YTPlayer.opt.vol && YTPlayer.player.getVolume() == 0 )
				jQuery( YTPlayer ).YTPUnmute();
			else if( ( !val && YTPlayer.player.getVolume() > 0 ) || ( val && YTPlayer.opt.vol == val ) ) {
				if( !YTPlayer.isMute )
					jQuery( YTPlayer ).YTPMute();
				else
					jQuery( YTPlayer ).YTPUnmute();
			} else {
				YTPlayer.opt.vol = val;
				YTPlayer.player.setVolume( YTPlayer.opt.vol );
				if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.updateSliderVal( val )
			}
			return this;
		},

		/**
		 * toggleVolume
		 * @returns {boolean}
		 */
		toggleVolume: function() {
			var YTPlayer = this.get( 0 );
			if( !YTPlayer ) return;
			if( YTPlayer.player.isMuted() ) {
				jQuery( YTPlayer ).YTPUnmute();
				return true;
			} else {
				jQuery( YTPlayer ).YTPMute();
				return false;
			}
		},

		/**
		 * mute
		 * @returns {jQuery.mbYTPlayer}
		 */
		mute: function() {
			var YTPlayer = this.get( 0 );
			if( YTPlayer.isMute ) return;
			YTPlayer.player.mute();
			YTPlayer.isMute = true;
			YTPlayer.player.setVolume( 0 );
			if( YTPlayer.volumeBar && YTPlayer.volumeBar.length && YTPlayer.volumeBar.width() > 10 ) {
				YTPlayer.volumeBar.updateSliderVal( 0 );
			}
			var controls = jQuery( "#controlBar_" + YTPlayer.id );
			var muteBtn = controls.find( ".mb_YTPMuteUnmute" );
			muteBtn.html( jQuery.mbYTPlayer.controls.unmute );
			jQuery( YTPlayer ).addClass( "isMuted" );
			if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.addClass( "muted" );
			var YTPEvent = jQuery.Event( "YTPMuted" );
			YTPEvent.time = YTPlayer.currentTime;

			if( !YTPlayer.preventTrigger )
				jQuery( YTPlayer ).trigger( YTPEvent );
			return this;
		},

		/**
		 * unmute
		 * @returns {jQuery.mbYTPlayer}
		 */
		unmute: function() {
			var YTPlayer = this.get( 0 );
			if( !YTPlayer.isMute ) return;
			YTPlayer.player.unMute();
			YTPlayer.isMute = false;
			YTPlayer.player.setVolume( YTPlayer.opt.vol );
			if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.updateSliderVal( YTPlayer.opt.vol > 10 ? YTPlayer.opt.vol : 10 );
			var controls = jQuery( "#controlBar_" + YTPlayer.id );
			var muteBtn = controls.find( ".mb_YTPMuteUnmute" );
			muteBtn.html( jQuery.mbYTPlayer.controls.mute );
			jQuery( YTPlayer ).removeClass( "isMuted" );
			if( YTPlayer.volumeBar && YTPlayer.volumeBar.length ) YTPlayer.volumeBar.removeClass( "muted" );
			var YTPEvent = jQuery.Event( "YTPUnmuted" );
			YTPEvent.time = YTPlayer.currentTime;

			if( !YTPlayer.preventTrigger )
				jQuery( YTPlayer ).trigger( YTPEvent );

			return this;
		},

		/**************************************************************************************************************
		 * FILTERS
		 */

		/**
		 * applyFilter
		 * @param filter
		 * @param value
		 * @returns {jQuery.mbYTPlayer}
		 */
		applyFilter: function( filter, value ) {
			return this.each( function() {
				var YTPlayer = this;
				YTPlayer.filters[ filter ].value = value;
				if( YTPlayer.filtersEnabled )
					jQuery( YTPlayer ).YTPEnableFilters();
			} );
		},

		/**
		 * applyFilters
		 * @param filters
		 * @returns {jQuery.mbYTPlayer}
		 */
		applyFilters: function( filters ) {
			return this.each( function() {
				var YTPlayer = this;
				if( !YTPlayer.isReady ) {
					jQuery( YTPlayer ).on( "YTPReady", function() {
						jQuery( YTPlayer ).YTPApplyFilters( filters );
					} );
					return;
				}

				for( var key in filters )
					jQuery( YTPlayer ).YTPApplyFilter( key, filters[ key ] );

				jQuery( YTPlayer ).trigger( "YTPFiltersApplied" );
			} );
		},

		/**
		 * toggleFilter
		 * @param filter
		 * @param value
		 * @returns {*}
		 */
		toggleFilter: function( filter, value ) {
			return this.each( function() {
				var YTPlayer = this;
				if( !YTPlayer.filters[ filter ].value ) YTPlayer.filters[ filter ].value = value;
				else YTPlayer.filters[ filter ].value = 0;
				if( YTPlayer.filtersEnabled ) jQuery( this ).YTPEnableFilters();
			} );
		},

		/**
		 * toggleFilters
		 * @param callback
		 * @returns {*}
		 */
		toggleFilters: function( callback ) {
			return this.each( function() {
				var YTPlayer = this;
				if( YTPlayer.filtersEnabled ) {
					jQuery( YTPlayer ).trigger( "YTPDisableFilters" );
					jQuery( YTPlayer ).YTPDisableFilters();
				} else {
					jQuery( YTPlayer ).YTPEnableFilters();
					jQuery( YTPlayer ).trigger( "YTPEnableFilters" );
				}
				if( typeof callback == "function" )
					callback( YTPlayer.filtersEnabled );
			} )
		},

		/**
		 * disableFilters
		 * @returns {*}
		 */
		disableFilters: function() {
			return this.each( function() {
				var YTPlayer = this;
				var iframe = jQuery( YTPlayer.playerEl );
				iframe.css( "-webkit-filter", "" );
				iframe.css( "filter", "" );
				YTPlayer.filtersEnabled = false;
			} )
		},

		/**
		 * enableFilters
		 * @returns {*}
		 */
		enableFilters: function() {
			return this.each( function() {
				var YTPlayer = this;
				var iframe = jQuery( YTPlayer.playerEl );
				var filterStyle = "";
				for( var key in YTPlayer.filters ) {
					if( YTPlayer.filters[ key ].value )
						filterStyle += key.replace( "_", "-" ) + "(" + YTPlayer.filters[ key ].value + YTPlayer.filters[ key ].unit + ") ";
				}
				iframe.css( "-webkit-filter", filterStyle );
				iframe.css( "filter", filterStyle );
				YTPlayer.filtersEnabled = true;
			} );
		},

		/**
		 * removeFilter
		 * @param filter
		 * @param callback
		 * @returns {*}
		 */
		removeFilter: function( filter, callback ) {
			return this.each( function() {
				var YTPlayer = this;
				if( typeof filter == "function" ) {
					callback = filter;
					filter = null;
				}
				if( !filter )
					for( var key in YTPlayer.filters ) {
						jQuery( this ).YTPApplyFilter( key, 0 );
						if( typeof callback == "function" ) callback( key );
					} else {
						jQuery( this ).YTPApplyFilter( filter, 0 );
						if( typeof callback == "function" ) callback( filter );
					}
			} );

		},

		/**
		 * getFilters
		 * @returns {*}
		 */
		getFilters: function() {
			var YTPlayer = this.get( 0 );
			return YTPlayer.filters;
		},

		/****************************************************************
		 * MASK
		 */

		/**
		 * addMask
		 * @param mask
		 * @returns {jQuery.mbYTPlayer}
		 */
		addMask: function( mask ) {
			var YTPlayer = this.get( 0 );

			if( !mask )
				mask = YTPlayer.actualMask;

			var tempImg = jQuery( "<img/>" ).attr( "src", mask ).on( "load", function() {

				YTPlayer.overlay.CSSAnimate( {
					opacity: 0
				}, YTPlayer.opt.fadeOnStartTime, function() {

					YTPlayer.hasMask = true;

					tempImg.remove();

					YTPlayer.overlay.css( {
						backgroundImage: "url(" + mask + ")",
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center center",
						backgroundSize: "cover"
					} );

					YTPlayer.overlay.CSSAnimate( {
						opacity: 1
					}, YTPlayer.opt.fadeOnStartTime );

				} );

			} );

			return this;

		},

		/**
		 * removeMask
		 * @returns {jQuery.mbYTPlayer}
		 */
		removeMask: function() {
			var YTPlayer = this.get( 0 );

			YTPlayer.overlay.CSSAnimate( {
				opacity: 0
			}, YTPlayer.opt.fadeOnStartTime, function() {

				YTPlayer.hasMask = false;

				YTPlayer.overlay.css( {
					backgroundImage: "",
					backgroundRepeat: "",
					backgroundPosition: "",
					backgroundSize: ""
				} );
				YTPlayer.overlay.CSSAnimate( {
					opacity: 1
				}, YTPlayer.opt.fadeOnStartTime );

			} );

			return this;

		},

		/**
		 * Apply mask
		 * @param YTPlayer
		 */
		applyMask: function( YTPlayer ) {
			var $YTPlayer = jQuery( YTPlayer );
			$YTPlayer.off( "YTPTime.mask" );

			if( YTPlayer.opt.mask ) {

				if( typeof YTPlayer.opt.mask == "string" ) {
					$YTPlayer.YTPAddMask( YTPlayer.opt.mask );

					YTPlayer.actualMask = YTPlayer.opt.mask;

				} else if( typeof YTPlayer.opt.mask == "object" ) {

					for( var time in YTPlayer.opt.mask ) {
						if( YTPlayer.opt.mask[ time ] )
							var img = jQuery( "<img/>" ).attr( "src", YTPlayer.opt.mask[ time ] );
					}

					if( YTPlayer.opt.mask[ 0 ] )
						$YTPlayer.YTPAddMask( YTPlayer.opt.mask[ 0 ] );

					$YTPlayer.on( "YTPTime.mask", function( e ) {
						for( var time in YTPlayer.opt.mask ) {
							if( e.time == time )
								if( !YTPlayer.opt.mask[ time ] ) {
									$YTPlayer.YTPRemoveMask();
								} else {

									$YTPlayer.YTPAddMask( YTPlayer.opt.mask[ time ] );
									YTPlayer.actualMask = YTPlayer.opt.mask[ time ];
								}
						}
					} );
				}
			}

			return this;
		},

		/**
		 * toggleMask
		 *
		 */
		toggleMask: function() {
			var YTPlayer = this.get( 0 );
			var $YTPlayer = $( YTPlayer );
			if( YTPlayer.hasMask )
				$YTPlayer.YTPRemoveMask();
			else
				$YTPlayer.YTPAddMask();

			return this;
		},

		/*******************************************************************************************************
		 * CONTROLS
		 */

		/**
		 * manageProgress
		 * @returns {{totalTime: number, currentTime: number}}
		 */
		manageProgress: function() {
			var YTPlayer = this.get( 0 );
			var controls = jQuery( "#controlBar_" + YTPlayer.id );
			var progressBar = controls.find( ".mb_YTPProgress" );
			var loadedBar = controls.find( ".mb_YTPLoaded" );
			var timeBar = controls.find( ".mb_YTPseekbar" );
			var totW = progressBar.outerWidth();
			var currentTime = Math.floor( YTPlayer.player.getCurrentTime() );
			var totalTime = Math.floor( YTPlayer.player.getDuration() );
			var timeW = ( currentTime * totW ) / totalTime;
			var startLeft = 0;
			var loadedW = YTPlayer.player.getVideoLoadedFraction() * 100;
			loadedBar.css( {
				left: startLeft,
				width: loadedW + "%"
			} );
			timeBar.css( {
				left: 0,
				width: timeW
			} );
			return {
				totalTime: totalTime,
				currentTime: currentTime
			};
		},

		/**
		 * buildControls
		 * @param YTPlayer
		 */
		buildControls: function( YTPlayer ) {
			var data = YTPlayer.opt;
			// @data.printUrl: is deprecated; use data.showYTLogo
			data.showYTLogo = data.showYTLogo || data.printUrl;

			if( jQuery( "#controlBar_" + YTPlayer.id ).length )
				return;
			YTPlayer.controlBar = jQuery( "<span/>" ).attr( "id", "controlBar_" + YTPlayer.id ).addClass( "mb_YTPBar" ).css( {
				whiteSpace: "noWrap",
				position: YTPlayer.isBackground ? "fixed" : "absolute",
				zIndex: YTPlayer.isBackground ? 10000 : 1000
			} ).hide();
			var buttonBar = jQuery( "<div/>" ).addClass( "buttonBar" );
			/* play/pause button*/
			var playpause = jQuery( "<span>" + jQuery.mbYTPlayer.controls.play + "</span>" ).addClass( "mb_YTPPlaypause ytpicon" ).click( function() {
				if( YTPlayer.player.getPlayerState() == 1 ) jQuery( YTPlayer ).YTPPause();
				else jQuery( YTPlayer ).YTPPlay();
			} );
			/* mute/unmute button*/
			var MuteUnmute = jQuery( "<span>" + jQuery.mbYTPlayer.controls.mute + "</span>" ).addClass( "mb_YTPMuteUnmute ytpicon" ).click( function() {
				if( YTPlayer.player.getVolume() == 0 ) {
					jQuery( YTPlayer ).YTPUnmute();
				} else {
					jQuery( YTPlayer ).YTPMute();
				}
			} );
			/* volume bar*/
			var volumeBar = jQuery( "<div/>" ).addClass( "mb_YTPVolumeBar" ).css( {
				display: "inline-block"
			} );
			YTPlayer.volumeBar = volumeBar;
			/* time elapsed */
			var idx = jQuery( "<span/>" ).addClass( "mb_YTPTime" );
			var vURL = data.videoURL ? data.videoURL : "";
			if( vURL.indexOf( "http" ) < 0 ) vURL = jQuery.mbYTPlayer.locationProtocol + "//www.youtube.com/watch?v=" + data.videoURL;
			var movieUrl = jQuery( "<span/>" ).html( jQuery.mbYTPlayer.controls.ytLogo ).addClass( "mb_YTPUrl ytpicon" ).attr( "title", "view on YouTube" ).on( "click", function() {
				window.open( vURL, "viewOnYT" )
			} );
			var onlyVideo = jQuery( "<span/>" ).html( jQuery.mbYTPlayer.controls.onlyYT ).addClass( "mb_OnlyYT ytpicon" ).on( "click", function() {
				jQuery( YTPlayer ).YTPFullscreen( data.realfullscreen );
			} );
			var progressBar = jQuery( "<div/>" ).addClass( "mb_YTPProgress" ).css( "position", "absolute" ).click( function( e ) {
				timeBar.css( {
					width: ( e.clientX - timeBar.offset().left )
				} );
				YTPlayer.timeW = e.clientX - timeBar.offset().left;
				YTPlayer.controlBar.find( ".mb_YTPLoaded" ).css( {
					width: 0
				} );
				var totalTime = Math.floor( YTPlayer.player.getDuration() );
				YTPlayer.goto = ( timeBar.outerWidth() * totalTime ) / progressBar.outerWidth();
				YTPlayer.player.seekTo( parseFloat( YTPlayer.goto ), true );
				YTPlayer.controlBar.find( ".mb_YTPLoaded" ).css( {
					width: 0
				} );
			} );
			var loadedBar = jQuery( "<div/>" ).addClass( "mb_YTPLoaded" ).css( "position", "absolute" );
			var timeBar = jQuery( "<div/>" ).addClass( "mb_YTPseekbar" ).css( "position", "absolute" );
			progressBar.append( loadedBar ).append( timeBar );
			buttonBar.append( playpause ).append( MuteUnmute ).append( volumeBar ).append( idx );
			if( data.showYTLogo ) {
				buttonBar.append( movieUrl );
			}
			if( YTPlayer.isBackground || ( eval( YTPlayer.opt.realfullscreen ) && !YTPlayer.isBackground ) ) buttonBar.append( onlyVideo );
			YTPlayer.controlBar.append( buttonBar ).append( progressBar );
			if( !YTPlayer.isBackground ) {
				YTPlayer.controlBar.addClass( "inlinePlayer" );
				YTPlayer.wrapper.before( YTPlayer.controlBar );
			} else {
				jQuery( "body" ).after( YTPlayer.controlBar );
			}
			volumeBar.simpleSlider( {
				initialval: YTPlayer.opt.vol,
				scale: 100,
				orientation: "h",
				callback: function( el ) {
					if( el.value == 0 ) {
						jQuery( YTPlayer ).YTPMute();
					} else {
						jQuery( YTPlayer ).YTPUnmute();
					}
					YTPlayer.player.setVolume( el.value );
					if( !YTPlayer.isMute ) YTPlayer.opt.vol = el.value;
				}
			} );
		},

		/************************************************************************************************************
		 * MANAGE PLAYER STATE
		 */

		/**
		 * checkForState
		 * @param YTPlayer
		 */
		checkForState: function( YTPlayer ) {
			var interval = YTPlayer.opt.showControls ? 100 : 400;
			clearInterval( YTPlayer.getState );
			//Checking if player has been removed from scene
			if( !jQuery.contains( document, YTPlayer ) ) {
				jQuery( YTPlayer ).YTPPlayerDestroy();
				clearInterval( YTPlayer.getState );
				clearInterval( YTPlayer.checkForStartAt );
				return;
			}

			jQuery.mbYTPlayer.checkForStart( YTPlayer );

			YTPlayer.getState = setInterval( function() {

				var prog = jQuery( YTPlayer ).YTPManageProgress();
				var $YTPlayer = jQuery( YTPlayer );
				var data = YTPlayer.opt;

				var startAt = YTPlayer.start_from_last ? YTPlayer.start_from_last : YTPlayer.opt.startAt ? YTPlayer.opt.startAt : 1;

				YTPlayer.start_from_last = null;

				var stopAt = YTPlayer.opt.stopAt > YTPlayer.opt.startAt ? YTPlayer.opt.stopAt : 0;
				stopAt = stopAt < YTPlayer.player.getDuration() ? stopAt : 0;
				if( YTPlayer.currentTime != prog.currentTime ) {

					var YTPEvent = jQuery.Event( "YTPTime" );
					YTPEvent.time = YTPlayer.currentTime;
					jQuery( YTPlayer ).trigger( YTPEvent );

				}
				YTPlayer.currentTime = prog.currentTime;
				YTPlayer.totalTime = YTPlayer.player.getDuration();
				if( YTPlayer.player.getVolume() == 0 ) $YTPlayer.addClass( "isMuted" );
				else $YTPlayer.removeClass( "isMuted" );

				if( YTPlayer.opt.showControls )
					if( prog.totalTime ) {
						YTPlayer.controlBar.find( ".mb_YTPTime" ).html( jQuery.mbYTPlayer.formatTime( prog.currentTime ) + " / " + jQuery.mbYTPlayer.formatTime( prog.totalTime ) );
					} else {
						YTPlayer.controlBar.find( ".mb_YTPTime" ).html( "-- : -- / -- : --" );
					}

				if( eval( YTPlayer.opt.stopMovieOnBlur ) ) {
					if( !document.hasFocus() ) {
						if( YTPlayer.state == 1 ) {
							YTPlayer.hasFocus = false;
							$YTPlayer.YTPPause();
						}
					} else if( document.hasFocus() && !YTPlayer.hasFocus && !( YTPlayer.state == -1 || YTPlayer.state == 0 ) ) {
						YTPlayer.hasFocus = true;
						$YTPlayer.YTPPlay();
					}
				}

				if( YTPlayer.opt.playOnlyIfVisible ) {
					var isOnScreen = jQuery.mbYTPlayer.isOnScreen( YTPlayer );
					if( !isOnScreen ) {
						$YTPlayer.YTPPause();
					} else {
						$YTPlayer.YTPPlay();
					}
				}

				if( YTPlayer.controlBar.length && YTPlayer.controlBar.outerWidth() <= 400 && !YTPlayer.isCompact ) {
					YTPlayer.controlBar.addClass( "compact" );
					YTPlayer.isCompact = true;
					if( !YTPlayer.isMute && YTPlayer.volumeBar ) YTPlayer.volumeBar.updateSliderVal( YTPlayer.opt.vol );
				} else if( YTPlayer.controlBar.length && YTPlayer.controlBar.outerWidth() > 400 && YTPlayer.isCompact ) {
					YTPlayer.controlBar.removeClass( "compact" );
					YTPlayer.isCompact = false;
					if( !YTPlayer.isMute && YTPlayer.volumeBar ) YTPlayer.volumeBar.updateSliderVal( YTPlayer.opt.vol );
				}

				if( YTPlayer.player.getPlayerState() == 1 && ( parseFloat( YTPlayer.player.getDuration() - .5 ) < YTPlayer.player.getCurrentTime() || ( stopAt > 0 && parseFloat( YTPlayer.player.getCurrentTime() ) > stopAt ) ) ) {
					if( YTPlayer.isEnded ) return;
					YTPlayer.isEnded = true;
					setTimeout( function() {
						YTPlayer.isEnded = false
					}, 1000 );

					if( YTPlayer.isPlayList ) {

						if( !data.loop || ( data.loop > 0 && YTPlayer.player.loopTime === data.loop - 1 ) ) {

							YTPlayer.player.loopTime = undefined;
							clearInterval( YTPlayer.getState );
							var YTPEnd = jQuery.Event( "YTPEnd" );
							YTPEnd.time = YTPlayer.currentTime;
							jQuery( YTPlayer ).trigger( YTPEnd );
							//YTPlayer.state = 0;
							return;
						}

					} else if( !data.loop || ( data.loop > 0 && YTPlayer.player.loopTime === data.loop - 1 ) ) {

						YTPlayer.player.loopTime = undefined;
						YTPlayer.preventTrigger = true;
						YTPlayer.state = 2;
						jQuery( YTPlayer ).YTPPause();

						YTPlayer.wrapper.CSSAnimate( {
							opacity: 0
						}, YTPlayer.opt.fadeOnStartTime, function() {

							if( YTPlayer.controlBar.length )
								YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );

							var YTPEnd = jQuery.Event( "YTPEnd" );
							YTPEnd.time = YTPlayer.currentTime;
							jQuery( YTPlayer ).trigger( YTPEnd );

							YTPlayer.player.seekTo( startAt, true );
							if( !YTPlayer.isBackground ) {
								if( YTPlayer.opt.backgroundUrl && YTPlayer.isPlayer ) {
									YTPlayer.opt.backgroundUrl = YTPlayer.opt.backgroundUrl || YTPlayer.orig_background;
									YTPlayer.opt.containment.css( {
										background: "url(" + YTPlayer.opt.backgroundUrl + ") center center",
										backgroundSize: "cover"
									} );
								}
							} else {
								if( YTPlayer.orig_background )
									jQuery( YTPlayer ).css( "background-image", YTPlayer.orig_background );
							}
						} );

						return;
					}

					YTPlayer.player.loopTime = YTPlayer.player.loopTime ? ++YTPlayer.player.loopTime : 1;
					startAt = startAt || 1;
					YTPlayer.preventTrigger = true;
					YTPlayer.state = 2;
					jQuery( YTPlayer ).YTPPause();
					YTPlayer.player.seekTo( startAt, true );
					$YTPlayer.YTPPlay();

				}
			}, interval );
		},

		/**
		 * checkForStart
		 * @param YTPlayer
		 */
		checkForStart: function( YTPlayer ) {

			var $YTPlayer = jQuery( YTPlayer );
			//Checking if player has been removed from scene
			if( !jQuery.contains( document, YTPlayer ) ) {
				jQuery( YTPlayer ).YTPPlayerDestroy();
				return
			}

			YTPlayer.preventTrigger = true;
			YTPlayer.state = 2;

			jQuery( YTPlayer ).YTPPlay();
			jQuery( YTPlayer ).YTPPause();
			jQuery( YTPlayer ).muteYTPVolume();
			jQuery( "#controlBar_" + YTPlayer.id ).remove();

			YTPlayer.controlBar = false;

			if( YTPlayer.opt.showControls )
				jQuery.mbYTPlayer.buildControls( YTPlayer );

			if( YTPlayer.overlay )
				if( YTPlayer.opt.addRaster ) {

					var classN = YTPlayer.opt.addRaster == "dot" ? "raster-dot" : "raster";
					YTPlayer.overlay.addClass( YTPlayer.isRetina ? classN + " retina" : classN );

				} else {

					YTPlayer.overlay.removeClass( function( index, classNames ) {
						// change the list into an array
						var current_classes = classNames.split( " " ),
							// array of classes which are to be removed
							classes_to_remove = [];
						jQuery.each( current_classes, function( index, class_name ) {
							// if the classname begins with bg add it to the classes_to_remove array
							if( /raster.*/.test( class_name ) ) {
								classes_to_remove.push( class_name );
							}
						} );
						classes_to_remove.push( "retina" );
						// turn the array back into a string
						return classes_to_remove.join( " " );
					} )

				}

			var startAt = YTPlayer.start_from_last ? YTPlayer.start_from_last : YTPlayer.opt.startAt ? YTPlayer.opt.startAt : 1;

			YTPlayer.start_from_last = null;
			YTPlayer.player.playVideo();
			YTPlayer.player.seekTo( startAt, true );
			clearInterval( YTPlayer.checkForStartAt );
			jQuery( YTPlayer ).YTPMute();

			YTPlayer.checkForStartAt = setInterval( function() {

				var canPlayVideo = YTPlayer.player.getVideoLoadedFraction() >= startAt / YTPlayer.player.getDuration();

				if( YTPlayer.player.getDuration() > 0 && YTPlayer.player.getCurrentTime() >= startAt && canPlayVideo ) {
					clearInterval( YTPlayer.checkForStartAt );
					if( typeof YTPlayer.opt.onReady == "function" )
						YTPlayer.opt.onReady( YTPlayer );

					YTPlayer.isReady = true;

					var YTPready = jQuery.Event( "YTPReady" );
					YTPready.time = YTPlayer.currentTime;
					jQuery( YTPlayer ).trigger( YTPready );

					YTPlayer.preventTrigger = true;
					YTPlayer.state = 2;

					jQuery( YTPlayer ).YTPPause();

					if( !YTPlayer.opt.mute )
						jQuery( YTPlayer ).YTPUnmute();

					YTPlayer.preventTrigger = false;

					if( YTPlayer.opt.autoPlay ) {

						$YTPlayer.YTPPlay();
						var YTPStart = jQuery.Event( "YTPStart" );
						YTPStart.time = YTPlayer.currentTime;
						jQuery( YTPlayer ).trigger( YTPStart );

						//todo see if it can be removed
						jQuery( YTPlayer.playerEl ).css( {
							opacity: 1
						} );

						YTPlayer.wrapper.CSSAnimate( {
							opacity: YTPlayer.isAlone ? 1 : YTPlayer.opt.opacity
						}, YTPlayer.opt.fadeOnStartTime * 2 );
						// end todo

						/* Fix for Safari freeze */
						if( jQuery.mbBrowser.os.name == "mac" && jQuery.mbBrowser.safari && jQuery.mbBrowser.versionCompare( jQuery.mbBrowser.fullVersion, "10.1" ) < 0 ) { //jQuery.mbBrowser.os.minor_version < 11

							YTPlayer.safariPlay = setInterval( function() {
								if( YTPlayer.state != 1 )
									$YTPlayer.YTPPlay();
								else
									clearInterval( YTPlayer.safariPlay )
							}, 10 )
						}

						$YTPlayer.one( "YTPReady", function() {
							$YTPlayer.YTPPlay();
						} );

					} else {

						setTimeout( function() {

							YTPlayer.player.pauseVideo();
							YTPlayer.player.seekTo( startAt, true );

							if( !YTPlayer.isPlayer ) {
								jQuery( YTPlayer.playerEl ).CSSAnimate( {
									opacity: 1
								}, YTPlayer.opt.fadeOnStartTime );

								YTPlayer.wrapper.CSSAnimate( {
									opacity: YTPlayer.isAlone ? 1 : YTPlayer.opt.opacity
								}, YTPlayer.opt.fadeOnStartTime );
							}

						}, 250 );

						if( YTPlayer.controlBar.length )
							YTPlayer.controlBar.find( ".mb_YTPPlaypause" ).html( jQuery.mbYTPlayer.controls.play );
						//$YTPlayer.YTPPlay();
					}

					if( YTPlayer.isPlayer && !YTPlayer.opt.autoPlay && ( YTPlayer.loading && YTPlayer.loading.length ) ) {
						YTPlayer.loading.html( "Ready" );
						setTimeout( function() {
							YTPlayer.loading.fadeOut();
						}, 100 )
					}

					if( YTPlayer.controlBar && YTPlayer.controlBar.length )
						YTPlayer.controlBar.slideDown( 1000 );

				} else if( jQuery.mbBrowser.os.name == "mac" && jQuery.mbBrowser.safari && jQuery.mbBrowser.fullVersion && jQuery.mbBrowser.versionCompare( jQuery.mbBrowser.fullVersion, "10.1" ) < 0 ) { //jQuery.mbBrowser.os.minor_version < 11

					YTPlayer.player.playVideo();

					if( startAt >= 0 )
						YTPlayer.player.seekTo( startAt, true );
				}

			}, 100 );

		},

		/********************************************************************************************************************
		 * UTILITIES
		 */

		/**
		 * getTime
		 * @returns {string} time
		 */
		getTime: function() {
			var YTPlayer = this.get( 0 );
			return jQuery.mbYTPlayer.formatTime( YTPlayer.currentTime );
		},

		/**
		 * getTotalTime
		 * @returns {string} total time
		 */
		getTotalTime: function() {
			var YTPlayer = this.get( 0 );
			return jQuery.mbYTPlayer.formatTime( YTPlayer.totalTime );
		},

		/**
		 * formatTime
		 * @param s
		 * @returns {string}
		 */
		formatTime: function( s ) {
			var min = Math.floor( s / 60 );
			var sec = Math.floor( s - ( 60 * min ) );
			return( min <= 9 ? "0" + min : min ) + " : " + ( sec <= 9 ? "0" + sec : sec );
		},

		/****************************************************************
		 * PLAYER POSITION
		 */

		/**
		 * setAnchor
		 * @param anchor
		 */
		setAnchor: function( anchor ) {
			var $YTplayer = this;
			$YTplayer.optimizeDisplay( anchor );
		},

		/**
		 * getAnchor
		 * @param anchor
		 */
		getAnchor: function() {
			var YTPlayer = this.get( 0 );
			return YTPlayer.opt.anchor;
		}
	};

	/**
	 * optimizeDisplay
	 * @param anchor
	 * can be center, top, bottom, right, left; (default is center,center)
	 */
	jQuery.fn.optimizeDisplay = function( anchor ) {
		var YTPlayer = this.get( 0 );
		var vid = {};

		YTPlayer.opt.anchor = anchor || YTPlayer.opt.anchor;
		YTPlayer.opt.anchor = typeof YTPlayer.opt.anchor != "undefined " ? YTPlayer.opt.anchor : "center,center";
		var YTPAlign = YTPlayer.opt.anchor.split( "," );

		if( YTPlayer.opt.optimizeDisplay ) {
			var abundance = YTPlayer.isPlayer ? 0 : 180;
			var win = {};
			var el = YTPlayer.wrapper;
			win.width = el.outerWidth();
			win.height = el.outerHeight() + abundance;
			YTPlayer.opt.ratio = eval( YTPlayer.opt.ratio );
			vid.width = win.width;
			vid.height = Math.ceil( vid.width / YTPlayer.opt.ratio );
			vid.marginTop = Math.ceil( -( ( vid.height - win.height ) / 2 ) );
			vid.marginLeft = 0;
			var lowest = vid.height < win.height;

			if( lowest ) {
				vid.height = win.height;
				vid.width = Math.ceil( vid.height * YTPlayer.opt.ratio );
				vid.marginTop = 0;
				vid.marginLeft = Math.ceil( -( ( vid.width - win.width ) / 2 ) );
			}

			for( var a in YTPAlign ) {

				if( YTPAlign.hasOwnProperty( a ) ) {
					var al = YTPAlign[ a ].replace( / /g, "" );
					switch( al ) {
						case "top":
							vid.marginTop = lowest ? -( ( vid.height - win.height ) / 2 ) : 0;
							break;
						case "bottom":
							vid.marginTop = lowest ? 0 : -( vid.height - ( win.height ) );
							break;
						case "left":
							vid.marginLeft = 0;
							break;
						case "right":
							vid.marginLeft = lowest ? -( vid.width - win.width ) : 0;
							break;
						default:
							if( vid.width > win.width )
								vid.marginLeft = -( ( vid.width - win.width ) / 2 );
							break;
					}
				}
			}

		} else {
			vid.width = "100%";
			vid.height = "100%";
			vid.marginTop = 0;
			vid.marginLeft = 0;
		}

		jQuery( YTPlayer.playerEl ).css( {
			width: vid.width,
			height: vid.height,
			marginTop: vid.marginTop,
			marginLeft: vid.marginLeft,
			maxWidth: "initial"
		} );
	};

	/**
	 * shuffle
	 * @param arr
	 * @returns {Array|string|Blob|*}
	 *
	 */
	jQuery.shuffle = function( arr ) {
		var newArray = arr.slice();
		var len = newArray.length;
		var i = len;
		while( i-- ) {
			var p = parseInt( Math.random() * len );
			var t = newArray[ i ];
			newArray[ i ] = newArray[ p ];
			newArray[ p ] = t;
		}
		return newArray;
	};

	/**
	 * Unselectable
	 * @returns {*}
	 */
	jQuery.fn.unselectable = function() {
		return this.each( function() {
			jQuery( this ).css( {
				"-moz-user-select": "none",
				"-webkit-user-select": "none",
				"user-select": "none"
			} ).attr( "unselectable", "on" );
		} );
	};

	/****************************************************************
	 * EXTERNAL METHODS
	 */

	/* Exposed public method */
	jQuery.fn.YTPlayer = jQuery.mbYTPlayer.buildPlayer;
	jQuery.fn.YTPGetPlayer = jQuery.mbYTPlayer.getPlayer;
	jQuery.fn.YTPGetVideoID = jQuery.mbYTPlayer.getVideoID;
	jQuery.fn.YTPChangeMovie = jQuery.mbYTPlayer.changeMovie;
	jQuery.fn.YTPPlayerDestroy = jQuery.mbYTPlayer.playerDestroy;

	jQuery.fn.YTPPlay = jQuery.mbYTPlayer.play;
	jQuery.fn.YTPTogglePlay = jQuery.mbYTPlayer.togglePlay;
	jQuery.fn.YTPStop = jQuery.mbYTPlayer.stop;
	jQuery.fn.YTPPause = jQuery.mbYTPlayer.pause;
	jQuery.fn.YTPSeekTo = jQuery.mbYTPlayer.seekTo;

	jQuery.fn.YTPlaylist = jQuery.mbYTPlayer.playlist;
	jQuery.fn.YTPPlayNext = jQuery.mbYTPlayer.playNext;
	jQuery.fn.YTPPlayPrev = jQuery.mbYTPlayer.playPrev;
	jQuery.fn.YTPPlayIndex = jQuery.mbYTPlayer.playIndex;

	jQuery.fn.YTPMute = jQuery.mbYTPlayer.mute;
	jQuery.fn.YTPUnmute = jQuery.mbYTPlayer.unmute;
	jQuery.fn.YTPToggleVolume = jQuery.mbYTPlayer.toggleVolume;
	jQuery.fn.YTPSetVolume = jQuery.mbYTPlayer.setVolume;

	jQuery.fn.YTPGetVideoData = jQuery.mbYTPlayer.getVideoData;
	jQuery.fn.YTPFullscreen = jQuery.mbYTPlayer.fullscreen;
	jQuery.fn.YTPToggleLoops = jQuery.mbYTPlayer.toggleLoops;
	jQuery.fn.YTPSetVideoQuality = jQuery.mbYTPlayer.setVideoQuality;
	jQuery.fn.YTPManageProgress = jQuery.mbYTPlayer.manageProgress;

	jQuery.fn.YTPApplyFilter = jQuery.mbYTPlayer.applyFilter;
	jQuery.fn.YTPApplyFilters = jQuery.mbYTPlayer.applyFilters;
	jQuery.fn.YTPToggleFilter = jQuery.mbYTPlayer.toggleFilter;
	jQuery.fn.YTPToggleFilters = jQuery.mbYTPlayer.toggleFilters;
	jQuery.fn.YTPRemoveFilter = jQuery.mbYTPlayer.removeFilter;
	jQuery.fn.YTPDisableFilters = jQuery.mbYTPlayer.disableFilters;
	jQuery.fn.YTPEnableFilters = jQuery.mbYTPlayer.enableFilters;
	jQuery.fn.YTPGetFilters = jQuery.mbYTPlayer.getFilters;

	jQuery.fn.YTPGetTime = jQuery.mbYTPlayer.getTime;
	jQuery.fn.YTPGetTotalTime = jQuery.mbYTPlayer.getTotalTime;

	jQuery.fn.YTPAddMask = jQuery.mbYTPlayer.addMask;
	jQuery.fn.YTPRemoveMask = jQuery.mbYTPlayer.removeMask;
	jQuery.fn.YTPToggleMask = jQuery.mbYTPlayer.toggleMask;

	jQuery.fn.YTPSetAnchor = jQuery.mbYTPlayer.setAnchor;
	jQuery.fn.YTPGetAnchor = jQuery.mbYTPlayer.getAnchor;

	/**
	 * @deprecated
	 * todo: Above methods will be removed with version 3.5.0
	 **/
	jQuery.fn.mb_YTPlayer = jQuery.mbYTPlayer.buildPlayer;
	jQuery.fn.playNext = jQuery.mbYTPlayer.playNext;
	jQuery.fn.playPrev = jQuery.mbYTPlayer.playPrev;
	jQuery.fn.changeMovie = jQuery.mbYTPlayer.changeMovie;
	jQuery.fn.getVideoID = jQuery.mbYTPlayer.getVideoID;
	jQuery.fn.getPlayer = jQuery.mbYTPlayer.getPlayer;
	jQuery.fn.playerDestroy = jQuery.mbYTPlayer.playerDestroy;
	jQuery.fn.fullscreen = jQuery.mbYTPlayer.fullscreen;
	jQuery.fn.buildYTPControls = jQuery.mbYTPlayer.buildControls;
	jQuery.fn.playYTP = jQuery.mbYTPlayer.play;
	jQuery.fn.toggleLoops = jQuery.mbYTPlayer.toggleLoops;
	jQuery.fn.stopYTP = jQuery.mbYTPlayer.stop;
	jQuery.fn.pauseYTP = jQuery.mbYTPlayer.pause;
	jQuery.fn.seekToYTP = jQuery.mbYTPlayer.seekTo;
	jQuery.fn.muteYTPVolume = jQuery.mbYTPlayer.mute;
	jQuery.fn.unmuteYTPVolume = jQuery.mbYTPlayer.unmute;
	jQuery.fn.setYTPVolume = jQuery.mbYTPlayer.setVolume;
	jQuery.fn.setVideoQuality = jQuery.mbYTPlayer.setVideoQuality;
	jQuery.fn.manageYTPProgress = jQuery.mbYTPlayer.manageProgress;
	jQuery.fn.YTPGetDataFromFeed = jQuery.mbYTPlayer.getVideoData;

} )( jQuery, ytp );
