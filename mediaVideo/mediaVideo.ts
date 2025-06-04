/*
 * @Author: LiuGuoBing
 * @Description: 
 * 
 * 
 * 1.  clip 
 * 2.  tryInitializeRemote()  setRemoteSource()
 * 3.  setRemoteSource()
 * 4.  dispose() 
 * 
 * 
 * -  setRemoteSource 
 * -  onDisable 
 * -  dispose() 
 * - 
 */

import { _decorator, Component, VideoClip, RenderableComponent, Texture2D, loader, EventHandler, game, Game, CCString, Material, Sprite, SpriteFrame, gfx, director, VideoPlayer } from 'cc';
import { JSB } from 'cc/env';
const { ccclass, property} = _decorator;
export enum EventType {     //
    PREPARING = 1,      //
    LOADED = 2,         //
    READY = 3,          //
    COMPLETED = 4,      //
    ERROR = 5,          //
    PLAYING = 6,        //
    PAUSED = 7,         //
    STOPPED = 8,        //
    BUFFER_START = 9,       //
    BUFFER_UPDATE = 10,
    BUFFER_END = 11,
    INIT = 12
};

enum VideoState {       //
    ERROR = -1,         //    
    IDLE = 0,           // 
    PREPARING = 1,      //
    PREPARED = 2,       //
    PLAYING = 3,        //
    PAUSED = 4,         //
    STOP = 5,
    COMPLETED = 5       //
};

enum ReadyState {       //
    HAVE_NOTHING = 0,       
    HAVE_METADATA = 1,
    HAVE_CURRENT_DATA = 2,
    HAVE_FUTURE_DATA = 3,
    HAVE_ENOUGH_DATA = 4    
};

enum PixelFormat {  //
    NONE = -1,      
    I420 = 0,        //yuv
    RGB = 2,        //rgb
    NV12 = 23,      //nv12
    NV21 = 24,      //nv21
    RGBA = 26       //rgba
};

const regions: gfx.BufferTextureCopy[] = [new gfx.BufferTextureCopy()];
const buffers: ArrayBufferView[] = [];


/**
 * 
 * @param eventType 
 * @returns 
 */
export function getEventName(eventType: EventType): string {
    switch (eventType) {
        case EventType.PREPARING:
            return 'preparing';
        case EventType.LOADED:
            return 'loaded';
        case EventType.READY:
            return 'ready';
        case EventType.COMPLETED:
            return 'completed';
        case EventType.ERROR:
            return 'error';
        case EventType.PLAYING:
            return 'playing';
        case EventType.PAUSED:
            return 'paused';
        case EventType.STOPPED:
            return 'stopped';
        case EventType.BUFFER_START:
            return 'buffer_start';
        case EventType.BUFFER_UPDATE:
            return 'buffer_update';
        case EventType.BUFFER_END:
            return 'buffer_end';
        case EventType.INIT: // EventTypeINIT
            return 'init';
        default:
            return 'unknown';
    }
}
   

@ccclass('MediaVideo')
export class MediaVideo extends Component {

    @property
    private _source: string = '';             //
    @property
    private _clip: VideoClip = null!;            //

    private _seekTime: number = 0;               // 
    private _nativeDuration: number = 0;         //
    private _nativeWidth: number = 0;           //          
    private _nativeHeight: number = 0;          //
    private _currentState = VideoState.IDLE;    //
    private _targetState = VideoState.IDLE;       //       
    private _pixelFormat = PixelFormat.RGBA;             //
    private _video: any = null;
    private _texture0: Texture2D = new Texture2D();     //0
    private _texture1: Texture2D = new Texture2D();     //1
    private _texture2: Texture2D = new Texture2D();     //2
    private _loaded: boolean = false;                   //
    private _isBuffering: boolean = false;              
    private _inBackground: boolean = false;             //
    private _lastPlayState: boolean = false;            //
    private _volume: number = -1;
    
    // 
    private _isTransitioning: boolean = false;         //
    private _keepLastFrame: boolean = false;           //
    private _transitionTimeout: any = null;            //
    
    @property(VideoClip)
    get clip() {
        return this._clip;
    }

    set clip(value: VideoClip) {
        this._clip = value;
    }

    @property(VideoPlayer)
    VideoView: VideoPlayer = null!;

    @property
    get source() {
        return this._source;
    }

    set source(value: string) {
        console.log(`[video] : ${value}`);
        this._source = value;
    }

    // loop property
    @property
    cache: boolean = false;

    // loop property
    @property
    loop: boolean = false;
    
    @property(RenderableComponent)
    public render: RenderableComponent = null!;

    // rgb material
    @property([Material])
    protected rgb: Material[] = [];

    // rgb material
    @property([Material])
    protected rgba: Material[] = [];

    // i420 material
    @property([Material])
    protected i420: Material[] = [];

    // nv12 material
    @property([Material])
    protected nv12: Material[] = [];

    // nv21 material
    @property([Material])
    protected nv21: Material[] = [];

    // video event handler for editor
    @property([EventHandler])
    public videoPlayerEvent: EventHandler[] = [];

    @property(Number)
    width: number = 1080;

    @property(Number)
    height: number = 1920;

    // 
    @property(Number)
    transitionDuration: number = 200;

    // current position of the video which is playing
    get currentTime() {
        if (!this._video) return 0;
        if (this._isInPlaybackState()) {
            if (JSB) {
                return this._video.currentTime();
            } else {
                return this._video.currentTime;
            }
        } else {
                return this._seekTime;
        }
    }
    
    // seek to position
    set currentTime(value: number) {
        if (!this._video) return;
        if (this._isInPlaybackState()) {
            if (JSB) {
                this._video.seek(value);
            } else {
                this._video.currentTime = value;
            }
        } else {
            this._seekTime = value;
        }
    }
    
        // duration of the video
    get duration(): number {
        if (!this._video) return 0;
        if (this._nativeDuration > 0) return this._nativeDuration;
        if (JSB) {
                this._nativeDuration = this._video.duration();
        } else {
            let duration = this._video.duration;
            this._nativeDuration = isNaN(duration) ? 0 : duration;
        }
        return this._nativeDuration;
    }
    
    // get width(): number {
    //     if (!this._isInPlaybackState()) return 0;
    //     if (this._nativeWidth > 0) return this._nativeWidth;
    //     if (JSB) {
    //         this._nativeWidth = this._video.width();
    //     } else {
    //         let width = this._video.videoWidth;
    //         this._nativeWidth = isNaN(width) ? 0 : width;
    //     }
    //     return this._nativeWidth;
    // }
    
    // get height(): number {
    //     if (!this._isInPlaybackState()) return 0;
    //     if (this._nativeHeight > 0) return this._nativeHeight;
    //     if (JSB) {
    //         this._nativeHeight = this._video.height();
    //     } else {
    //         let height = this._video.videoHeight;
    //         this._nativeHeight = isNaN(height) ? 0 : height;
    //     }
    //     return this._nativeHeight;
    // }
    
    // not accurate because native event is async, larger than actual percentage.
    get bufferPercentage(): number {
        if (!this._video) return 0;
        if (JSB) {
            return this._video.bufferPercentage();
        } else {
            return 0;
        }
    }

    private _isInitialize: boolean = false;

    start() {

    }

    public tryInitializeRemote(source: string) {
        const currentSource = this.source;
        
        // 
        if(this._isInitialize && currentSource === source) {
            console.log(`[video] : ${source}`);
            return;
        }
        
        // 
        if(this._isInitialize && currentSource !== source) {
            console.log(`[video] : ${currentSource} -> ${source}`);
            this._startSmoothTransition(source);
            return;
        }
        
        // console.log(`[video] initializeRemote, ${source}`);
        this.clip = null!;
        
        // VideoPlayerremoteURL
        if (this.VideoView) {
            this.VideoView.remoteURL = source;
            // console.log(`[video] initializeRemote VideoPlayer.remoteURL: ${source}`);
        }
        
        this._initialize();
        this.setRemoteSource(source);
    }

    /**
     * 
     */
    private _startSmoothTransition(source: string) {
        this.source = source;
        console.log(`[video] `);
        this._isTransitioning = true;
        this._keepLastFrame = true;
        
        // 
        if (this._transitionTimeout) {
            clearTimeout(this._transitionTimeout);
            this._transitionTimeout = null;
        }
        
        // 
        if (this._video && this._currentState === VideoState.PLAYING) {
            try {
                if (JSB) {
                    this._video.stop();
                } else {
                    this._video.pause();
                }
            } catch (e) {
                console.warn('[video] :', e);
            }
        }

        console.log(`[video] `);
        
        // 
        this._currentState = VideoState.PREPARING;
        
        // 
        this._transitionTimeout = setTimeout(() => {
            this._cleanupVideoResourcesForTransition();
        }, this.transitionDuration);
    }

    /**
     * 
     */
    private _finishSmoothTransition() {
        console.log(`[video] , ${this.source}`);
        
        // 
        if (this._transitionTimeout) {
            clearTimeout(this._transitionTimeout);
            this._transitionTimeout = null;
        }
        
        this._isTransitioning = false;
        this._keepLastFrame = false;
        
        this._initialize();
        this.finalSetRemoteSource(this.source);
    }

    /**
     * 
     */
    private _cleanupVideoResourcesForTransition() {
        if (!this._video) {
            // 
            this._finishSmoothTransition();
            return;
        }
        
        console.log(`[video] `);
        
        // 
        this._currentState = VideoState.PREPARING;
        this._targetState = VideoState.IDLE;
        this._loaded = false;
        this._seekTime = 0;
        this._nativeDuration = 0;
        this._nativeWidth = 0;
        this._nativeHeight = 0;
        
        if (JSB) {
            // 
            try {
                // 
                if (typeof this._video.stop === 'function') {
                    this._video.stop();
                }
                
                // 
                this.scheduleOnce(() => {
                    try {
                        // 
                        if (this._video && typeof this._video.destroy === 'function') {
                            this._video.destroy();
                        }
                    } catch (e) {
                        console.error(`[video] :`, e);
                    }
                    
                    // 
                    this._video = null;
                    this._isInitialize = false;
                    
                    console.log(`[video] `);
                    
                    // 
                    this._finishSmoothTransition();
                }, 0.1);
                
            } catch (e) {
                console.error(`[video] :`, e);
                // 
                this._video = null;
                this._isInitialize = false;
                this._finishSmoothTransition();
            }
        } else {
            // 
            try {
                this._video.pause();
                this._video.currentTime = 0;
                this._video.src = '';
                this._video.load(); // 
                
                // 
                this._video = null;
                this._isInitialize = false;
                
                console.log(`[video] `);
                
                // 
                this._finishSmoothTransition();
            } catch (e) {
                console.error(`[video] :`, e);
                // 
                this._video = null;
                this._isInitialize = false;
                this._finishSmoothTransition();
            }
        }
    }

    /**
     * 
     */
    private _initialize() {
        if (JSB) {
            this._initializeNative();
        } else {
            this._initializeBrowser();
        }
        this._isInitialize = true;
    }

    /**
     * 
     */
    private _initializeNative() {
        // FFmpeg  VideoPlayer 
        if(this.VideoView && this.VideoView.node && this.VideoView.node.isValid) {
            this.VideoView.node.destroy();
        }

        try {
            // 
            if (this._video && !this._isTransitioning) {
                console.log('[video] ');
                this._cleanupVideoResources();
            }
            
            this._video = new window.gfx.Video();
            this._video.addEventListener('loaded', () => this._onMetaLoaded());
            this._video.addEventListener('ready', () => this._onReadyToPlay());
            this._video.addEventListener('completed', () => this._onCompleted());
            this._video.addEventListener('error', () => this._onError());
            this._video.addEventListener('buffer_start', () => this._onBufferStart());
            this._video.addEventListener('buffer_update', () => this._onBufferUpdate());
            this._video.addEventListener('buffer_end', () => this._onBufferEnd());
            this._video.addEventListener('frame_update', () => this._onFrameUpdate());
            
            console.log('[video] ');
        } catch (error) {
            console.error('[video] :', error);
            this._video = null;
            this._currentState = VideoState.ERROR;
        }
    }

    /**
     * initialize browser player, register video event handler
     */
     private _initializeBrowser(): void {
        // @ts-ignore
        this._video = this.VideoView._impl._video;
        this._video.crossOrigin = 'anonymous';
        this._video.autoplay = false;
        this._video.loop = false;
        this._video.muted = false;
        // this.textures = [
        //     // @ts-ignore
        //     new cc.renderer.Texture2D(cc.renderer.device, {
        //         wrapS: gfx.WRAP_CLAMP,
        //         wrapT: gfx.WRAP_CLAMP,
        //         genMipmaps: false,
        //         premultiplyAlpha: false,
        //         flipY: false,
        //         format: gfx.TEXTURE_FMT_RGBA8
        //     })
        // ];
        this._video.addEventListener('loadedmetadata', () => this._onMetaLoaded());
        this._video.addEventListener('ended', () => this._onCompleted());
        this._loaded = false;
        let onCanPlay = () => {
            if (this._loaded || this._currentState == VideoState.PLAYING)
                return;
            if (this._video.readyState === ReadyState.HAVE_ENOUGH_DATA ||
                this._video.readyState === ReadyState.HAVE_METADATA) {
                this._video.currentTime = 0;
                this._loaded = true;
                this._onReadyToPlay();
            }
        };
        this._video.addEventListener('canplay', onCanPlay);
        this._video.addEventListener('canplaythrough', onCanPlay);
        this._video.addEventListener('suspend', onCanPlay);

        // @ts-ignore
        // let gl = cc.renderer.device._gl;
        // this.update = dt => {
        //     if (this._isInPlaybackState()) {
        //         gl.bindTexture(gl.TEXTURE_2D, this.textures[0]._glID);
        //         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.impl);
        //         // @ts-ignore
        //         cc.renderer.device._restoreTexture(0);
        //     }
        // };
    }

    /**
     * 
     */
    private _cleanupVideoResources() {
        if (!this._video) return;
        
        console.log(`[video] `);
        
        // 
        this._currentState = VideoState.IDLE;
        this._targetState = VideoState.IDLE;
        this._loaded = false;
        this._seekTime = 0;
        this._nativeDuration = 0;
        this._nativeWidth = 0;
        this._nativeHeight = 0;
        
        if (JSB) {
            // 
            try {
                // 
                if (typeof this._video.stop === 'function') {
                    this._video.stop();
                }
                
                // removeEventListener
                // 
                if (typeof this._video.destroy === 'function') {
                    this._video.destroy();
                }
            } catch (e) {
                console.error(`[video] :`, e);
            }
        } else {
            // 
            try {
                this._video.pause();
                this._video.currentTime = 0;
                this._video.src = '';
                this._video.load(); // 
            } catch (e) {
                console.error(`[video] :`, e);
            }
        }
        
        console.log(`[video] `);
    }

    /**
     * 
     */
    private _updateVideoSource() {
        let url = '';
        if (this.source) {
            url = this.source;
        }
        if (this._clip) {
            url = this._clip.nativeUrl;
        }
        if (url && loader.md5Pipe) {
            url = loader.md5Pipe.transformURL(url);
        }

        console.log(`[video]_updateVideoSource, ${url}`);
        
        // JSB
        if (JSB && this._video) {
            // 
            if (this._currentState === VideoState.PLAYING) {
                try {
                    this._video.stop();
                } catch (e) {
                    console.warn('[video] :', e);
                }
            }
            
            // URL
            try {
                this._video.setURL(url, this.cache);
                this._video.prepare();
            } catch (e) {
                console.error('[video] URL:', e);
                // 
                this._cleanupVideoResources();
                
                // 
                try {
                    this._video = new window.gfx.Video();
                    this._video.addEventListener('loaded', () => this._onMetaLoaded());
                    this._video.addEventListener('ready', () => this._onReadyToPlay());
                    this._video.addEventListener('completed', () => this._onCompleted());
                    this._video.addEventListener('error', () => this._onError());
                    this._video.addEventListener('buffer_start', () => this._onBufferStart());
                    this._video.addEventListener('buffer_update', () => this._onBufferUpdate());
                    this._video.addEventListener('buffer_end', () => this._onBufferEnd());
                    this._video.addEventListener('frame_update', () => this._onFrameUpdate());
                    
                    this._video.setURL(url, this.cache);
                    this._video.prepare();
                } catch (createError) {
                    console.error('[video] :', createError);
                    this._video = null;
                    return;
                }
            }
        } else if (!JSB && this._video) {
            this._loaded = false;
            this._video.pause();
            this._video.src = url;
        } else if (!this._video) {
            console.error('[video] ');
            return;
        }

        this.node.emit('preparing', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.PREPARING);
    }

    /**
     * register game show and hide event handler
     */
     public onEnable(): void {
        game.on(Game.EVENT_SHOW, this._onShow, this);
        game.on(Game.EVENT_HIDE, this._onHide, this);
    }

    // unregister game show and hide event handler
    public onDisable(): void {
        console.log(`[video] onDisable `);
        game.off(Game.EVENT_SHOW, this._onShow, this);
        game.off(Game.EVENT_HIDE, this._onHide, this);
        
        // 
        if (this._transitionTimeout) {
            clearTimeout(this._transitionTimeout);
            this._transitionTimeout = null;
        }
        this._isTransitioning = false;
        this._keepLastFrame = false;
        
        // 
        this.stop();
        this._cleanupVideoResources();
        
        // 
        this._video = null;
        this._isInitialize = false;
        
        console.log(`[video] onDisable `);
    }

    private _onShow(): void {
        if (!this._inBackground) return;
        this._inBackground = false;
        if (this._lastPlayState) this.resume();
    }

    private _onHide(): void {
        if (this._inBackground) return;
        this._inBackground = true;
        this._lastPlayState = this.isPlaying();
        if (this._lastPlayState) this.pause();
    }

    update(deltaTime: number) {
        if (this._isInPlaybackState() && !JSB && this._video && this._texture0) {
            // 
            if (this._isTransitioning) {
                return;
            }
            
            // 
            if (!this._texture0 || !this._texture0.isValid) {
                console.warn('[video] update');
                return;
            }
            
            // 
            if (!this._video.videoWidth || !this._video.videoHeight) {
                return;
            }
            
            // 
            if (this._currentState === VideoState.IDLE || 
                this._currentState === VideoState.ERROR ||
                this._currentState === VideoState.PREPARING) {
                return;
            }
            
            try {
                // 
                if (this._texture0 && this._texture0.isValid && !this._isTransitioning) {
                    this._texture0.uploadData(this._video);
                    this._updateMaterial();
                }
            } catch (error) {
                console.error('[video] update:', error);
                // 
                this._currentState = VideoState.ERROR;
                // 
                this.scheduleOnce(() => {
                    if (this._currentState === VideoState.ERROR) {
                        console.log('[video] ');
                        this.stop();
                    }
                }, 1.0); // 1
            }
        } 
    }

    private _copyTextureToTexture2D(texture2D: Texture2D, texture: gfx.Texture) {
        // 
        if (!director.root || !director.root.device) {
            console.warn('[video] director.root  device ');
            return;
        }
        
        // 
        if (this._isTransitioning) {
            console.warn('[video] ');
            return;
        }
        
        // 
        if (!texture2D || !texture2D.isValid || !texture) {
            console.warn('[video] ');
            return;
        }
        
        if (!buffers.length) {
            buffers[0] = new Uint8Array(texture.size);
        }
        regions[0].texExtent.width = texture.width;
        regions[0].texExtent.height = texture.height;
        regions[0].texSubres.mipLevel = 0;
        regions[0].texSubres.baseArrayLayer = 0;
        
        try {
            director.root.device.copyTextureToBuffers(texture, buffers, regions);
            // 
            if (!this._isTransitioning && texture2D && texture2D.isValid) {
                texture2D.uploadData(buffers[0]);
            }
        } catch (error) {
            console.error('[video] :', error);
        }
    }

    /**
     * 
     */
    protected _updateMaterial(): void {
        if (!this.render) {
            console.warn('[video] render');
            return;
        }
        
        // 
        if (this._isTransitioning) {
            return;
        }
        
        // 
        if (this._currentState === VideoState.IDLE || 
            this._currentState === VideoState.ERROR ||
            this._currentState === VideoState.STOP ||
            this._currentState === VideoState.PREPARING) {
            return;
        }
        
        try {
            let material = this.render.getMaterialInstance(0);
            if (material && this._texture0 && this._texture0.isValid && !this._isTransitioning) {
                material.setProperty('texture0', this._texture0);
                switch (this._pixelFormat) {
                    case PixelFormat.I420:
                        if (this._texture2 && this._texture2.isValid) {
                            material.setProperty('texture2', this._texture2);
                        }
                    // fall through
                    case PixelFormat.NV12:
                    case PixelFormat.NV21:
                        if (this._texture1 && this._texture1.isValid) {
                            material.setProperty('texture1', this._texture1);
                        }
                        break;
                }
            }
        } catch (error) {
            console.error('[video] :', error);
            // 
            this._currentState = VideoState.ERROR;
        }
    }


    /**
     * 
     */
    private _updateTexture() {
        if (this.render instanceof Sprite) {
            let sprite: Sprite = this.render;
            if (sprite.spriteFrame === null) {
                sprite.spriteFrame = new SpriteFrame();
            }
            let texture = new Texture2D(); 
            this._resetTexture(texture, this.width, this.height);   
            sprite.spriteFrame.texture = texture;
        }
        this._resetTexture(this._texture0, this.width, this.height);
        let material = this.render?.material;
        material?.setProperty('texture0', this._texture0);
        switch (this._pixelFormat) {
            case PixelFormat.I420:
                this._resetTexture(this._texture1, this.width >> 1, this.height >> 1);
                material?.setProperty('texture1', this._texture1);
                this._resetTexture(this._texture2, this.width >> 1, this.height >> 1);
                material?.setProperty('texture2', this._texture2);
                break;
                // fall through
            case PixelFormat.NV12:
            case PixelFormat.NV21:
                this._resetTexture(this._texture1, this.width >> 1, this.height >> 1, gfx.Format.RG8);
                material?.setProperty('texture1', this._texture1);
                break;
        }
    }

    /**
     * 
     * @param texture 
     * @param width 
     * @param height 
     */
    private _resetTexture(texture: Texture2D, width: number, height: number, format?: number) {
        if (!texture) {
            console.warn('[video] ');
            return;
        }
        
        try {
            texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
            texture.setMipFilter(Texture2D.Filter.LINEAR);
            texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
            

            texture.reset({
                width: width,
                height: height,
                //@ts-ignore
                format:  format ? format : JSB ?gfx.Format.R8: gfx.Format.RGB8
            });
        } catch (error) {
            console.error('[video] :', error);
        }
    }

    private _onMetaLoaded() {
        this.node.emit('loaded', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.LOADED);
    }

    private _onReadyToPlay() {        
        console.log('[video] _onReadyToPlay ');
        this._updatePixelFormat();
        this._currentState = VideoState.PREPARED;
        if (this._seekTime > 0.1) {
            this.currentTime = this._seekTime;
        }
        this._updateTexture();
        
        // 
        if (this._isTransitioning) {
            console.log('[video] ');
            this._finishSmoothTransition();
        }
        
        this.node.emit('ready', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.READY);
        
        // 
        if (this._targetState == VideoState.PLAYING) {
            console.log('[video] ');
            this.play();
        }
        console.log('[video] _onReadyToPlay ');
    }

    private _onCompleted() {
        if (this.loop) {
            if (this._currentState == VideoState.PLAYING) {
                this.currentTime = 0;
                this._video.play();
            }
        } else {
            this._currentState = VideoState.COMPLETED;
            this._targetState = VideoState.COMPLETED;
            this.node.emit('completed', this);
            EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.COMPLETED);
        }
    }

    private _onError() {
        this._currentState = VideoState.ERROR;
        this._targetState = VideoState.ERROR;
        this.node.emit('error', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.ERROR);
    }

    private _onBufferStart() {
        this._isBuffering = true;
        this.node.emit('buffer_start', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.BUFFER_START);
    }

    private _onBufferUpdate() {
        this.node.emit('buffer_update', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.BUFFER_UPDATE);
    }

    private _onBufferEnd() {
        this._isBuffering = false;
        this.node.emit('buffer_end', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.BUFFER_END);
    }

    private _onFrameUpdate() {
        // 
        if (!this._isInPlaybackState() || !JSB || !this._video) return;
        
        // 
        if (this._isTransitioning) {
            return;
        }
        
        // 
        if (!this._texture0 || !this._texture0.isValid || 
            !this._texture1 || !this._texture1.isValid || 
            !this._texture2 || !this._texture2.isValid) {
            console.warn('[video] ');
            return;
        }
        
        // 
        if (this._currentState === VideoState.IDLE || 
            this._currentState === VideoState.ERROR ||
            this._currentState === VideoState.PREPARING) {
            return;
        }
        
        try {
            let datas: any = this._video.getDatas();
            if (!datas || !datas.length) return;

            // 
            // 
            if (datas.length > 0 && this._texture0 && this._texture0.isValid && !this._isTransitioning) {
                this._texture0.uploadData(datas[0]);
            }
            if (datas.length > 1 && this._texture1 && this._texture1.isValid && !this._isTransitioning) {
                this._texture1.uploadData(datas[1]);
            }
            if (datas.length > 2 && this._texture2 && this._texture2.isValid && !this._isTransitioning) {
                this._texture2.uploadData(datas[2]);
            }
            
            // 
            if (!this._isTransitioning) {
                this._updateMaterial();
            }
        } catch (error) {
            console.error('[video] :', error);
            // 
            this._currentState = VideoState.ERROR;
            // 
            this.scheduleOnce(() => {
                if (this._currentState === VideoState.ERROR) {
                    console.log('[video] ');
                    this.stop();
                }
            }, 2.0); // 
        }
    }
    

    private _updatePixelFormat(): void {
        let index: number = this.render instanceof Sprite ? 1 : 0; 
        let pixelFormat = JSB ? this._video.pixelFormat() : PixelFormat.RGB;
        if (this._pixelFormat == pixelFormat) return;
        this._pixelFormat = pixelFormat;
        switch (pixelFormat) {
            case PixelFormat.RGB:
                this.render.setMaterial(this.rgb[index], 0);
                break;
            case PixelFormat.RGBA:
                this.render.setMaterial(this.rgba[index], 0);
                break;
            case PixelFormat.I420:
                this.render.setMaterial(this.i420[index], 0);
                break;
            case PixelFormat.NV12:
                this.render.setMaterial(this.nv12[index], 0);
                break;
            case PixelFormat.NV21:
                this.render.setMaterial(this.nv21[index], 0);
                break;
        }
    }

    /**
     * 
     */
     public play() {
        if (this._isInPlaybackState()) {
            if (this._currentState == VideoState.COMPLETED) {
                this.currentTime = 0;
            }
            if (this._currentState != VideoState.PLAYING) {
                if (this._volume !== -1) {
                    this.setVolume(this._volume);
                    this._volume = -1;
                } 
                this._video.play();
                this.node.emit('playing', this);
                this._currentState = VideoState.PLAYING;
                this._targetState = VideoState.PLAYING;
                EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.PLAYING);
            }
        } else {
            this._targetState = VideoState.PLAYING;
        }
    }

    /**
     * 
     */
    public resume() {
        if (this._isInPlaybackState() && this._currentState != VideoState.PLAYING) {
            if (JSB) {
                this._video.resume();
            } else {
                this._video.play();
            }
            this.node.emit('playing', this);
            this._currentState = VideoState.PLAYING;
            this._targetState = VideoState.PLAYING;
            EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.PLAYING);
        } else {
            this._targetState = VideoState.PLAYING;
        }
    }

    /**
     * 
     */
    public pause() {
        if (this._isInPlaybackState() && this._currentState != VideoState.PAUSED) {
            this._video.pause();
            this.node.emit('paused', this);
            this._currentState = VideoState.PAUSED;
            this._targetState = VideoState.PAUSED;
            EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.PAUSED);
        } else {
            this._targetState = VideoState.PAUSED;
        }
    }

    /**
     * 
     */
    public stop() {
        this._seekTime = 0;
        if (this._isInPlaybackState() && this._currentState != VideoState.STOP) {
            if (JSB) {
                this._video.stop();
            } else {
                this._video.pause();
                this._video.currentTime = 0;
            }

            this.node.emit('stopped', this);
            this._currentState = VideoState.STOP;
            this._targetState = VideoState.STOP;
            EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.STOPPED);
        } else {
            this._targetState = VideoState.STOP;
        }
    }

    /**
     * 
     * @param volume  0-1
     * @returns 
     */
    public setVolume(volume: number) {
        if (!this._isInPlaybackState()) {
            this._volume = volume;
            return;
        }
        if(JSB) {
            this._video.setVolume(volume);
        } else {
            this._video.volume = volume;
        }
    }

    /**
     * 
     */
    public clear() {
        console.log(`[video]  clear `);
        this._cleanupVideoResources();
        this._video = null;
    }

    /**
     * 
     * @returns 
     */
    public isPlaying() {
        return this._currentState == VideoState.PLAYING || this._targetState == VideoState.PLAYING;
    }

    
    public seek(time: number) {
        this.pause();
        this._seekTime = time;
        this._video.currentTime = time;
        this.resume();
    }

    private _isInPlaybackState() {
        return !!this._video && this._currentState != VideoState.IDLE && this._currentState != VideoState.PREPARING && this._currentState != VideoState.ERROR;
    }

    public setRemoteSource(source: string) {
        console.log(`[video] setRemoteSource: ${source}, : ${this.source}, : ${this._currentState}`);
        
        const currentSource = this.source; 
        
        // 
        // 
        if (currentSource === source && this._currentState === VideoState.PLAYING && this._isInitialize) {
            console.log(`[video] : ${source}`);
            return;
        }
        
        // 
        if (currentSource != "")
        {
            if (this._isInitialize  && currentSource !== source) {
                console.log(`[video] setRemoteSource : ${currentSource} -> ${source}`);
                this._startSmoothTransition(source);
                return;
            } else if (currentSource === source && this._currentState !== VideoState.PLAYING) {
                // 
                console.log(`[video] : ${source}, : ${this._currentState}`);
            }
        }

        this.finalSetRemoteSource(source);
    }

    private finalSetRemoteSource(source: string) {
        // VideoPlayerremoteURL
        if (this.VideoView) {
            this.VideoView.remoteURL = source;
        }
        
        this.clip = null!;
        this.source = source; // setter
        
        this._updateVideoSource();
    }

    /**
     * 
     * @param duration 
     */
    public setTransitionDuration(duration: number) {
        this.transitionDuration = Math.max(50, Math.min(1000, duration)); // 50-1000ms
        console.log(`[video] : ${this.transitionDuration}ms`);
    }

    /**
     * 
     */
    public isTransitioning(): boolean {
        return this._isTransitioning;
    }

    /**
     * 
     * 
     */
    public dispose() {
        console.log(`[video] `);
        
        // 
        if (this._transitionTimeout) {
            clearTimeout(this._transitionTimeout);
            this._transitionTimeout = null;
        }
        this._isTransitioning = false;
        this._keepLastFrame = false;
        
        // 
        if (this._currentState === VideoState.PLAYING) {
            this.stop();
        }
        
        // 
        this._cleanupVideoResources();
        
        // 
        this._video = null;
        this._isInitialize = false;
        
        // 
        try {
            if (this._texture0) {
                if (this._texture0.isValid) {
                    this._texture0.destroy();
                }
                this._texture0 = null!;
            }
            if (this._texture1) {
                if (this._texture1.isValid) {
                    this._texture1.destroy();
                }
                this._texture1 = null!;
            }
            if (this._texture2) {
                if (this._texture2.isValid) {
                    this._texture2.destroy();
                }
                this._texture2 = null!;
            }
        } catch (error) {
            console.error('[video] :', error);
            // 
            this._texture0 = null!;
            this._texture1 = null!;
            this._texture2 = null!;
        }
        
        console.log(`[video] `);
    }
}

