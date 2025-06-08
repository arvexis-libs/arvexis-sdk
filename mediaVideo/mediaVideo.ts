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

import { UITransform } from 'cc';
import { UIOpacity } from 'cc';
import { _decorator, Component, VideoClip, RenderableComponent, Texture2D, loader, EventHandler, game, Game, CCString, Material, Sprite, SpriteFrame, gfx, director, VideoPlayer, screen } from 'cc';
import { JSB } from 'cc/env';
import { error } from 'console';
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
    STOP = 5,           //
    COMPLETED = 6       //
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
    private _volume: number = 1;
    
    /** Sprite */
    @property(Sprite)
    private tempSprite: Sprite = null!;

    /**  */
    @property(UIOpacity)
    private videoOpacity: UIOpacity = null!;
    
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

    private _isTransitioning: boolean = false;

    start() {

    }

    public tryInitializeRemote(source: string) {
        const currentSource = this.source;
        
        // 
        if(this._isInitialize && currentSource === source) {
            console.log(`[video] : ${source}`);
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
            if (this._video) {
                this.copyCurrentFrameToSprite();
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
        // VideoPlayervideo
        if (!this.VideoView || !(this.VideoView as any)._impl) {
            console.error('[video] VideoView  _impl ');
            return;
        }
        
        this._video = (this.VideoView as any)._impl._video;
        this._video.crossOrigin = 'anonymous';
        this._video.autoplay = false;
        this._video.loop = false;
        this._video.muted = false;
        
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
        this._isTransitioning = false;
        
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
            
            // 
            if (!this._video || this._video.readyState === undefined || this._video.readyState < ReadyState.HAVE_METADATA) {
                return;
            }
            
            try {
                // 
                if (this._texture0 && this._texture0.isValid && !this._isTransitioning) {
                    // 
                    if (this._video.videoWidth > 0 && this._video.videoHeight > 0) {
                        this._texture0.uploadData(this._video);
                        this._updateMaterial();
                    }
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
        
        // 
        if (width <= 0 || height <= 0) {
            console.warn(`[video] : ${width}x${height}`);
            return;
        }
        
        // 
        const maxDimension = 8192; // 
        if (width > maxDimension || height > maxDimension) {
            console.warn(`[video] : ${width}x${height}${maxDimension}x${maxDimension}`);
            width = Math.min(width, maxDimension);
            height = Math.min(height, maxDimension);
        }
        
        try {
            texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
            texture.setMipFilter(Texture2D.Filter.LINEAR);
            texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
            
            // 
            let textureFormat = format;
            if (!textureFormat) {
                textureFormat = JSB ? gfx.Format.R8 : gfx.Format.RGB8;
            }
            
            texture.reset({
                width: width,
                height: height,
                format: textureFormat as any
            });
            
            console.log(`[video] : ${width}x${height}, : ${textureFormat}`);
        } catch (error) {
            console.error('[video] :', error);
            // 
            try {
                texture.reset({
                    width: Math.min(width, 1024),
                    height: Math.min(height, 1024),
                    format: gfx.Format.RGB8 as any
                });
                console.log('[video] ');
            } catch (fallbackError) {
                console.error('[video] :', fallbackError);
            }
        }
    }

    private _onMetaLoaded() {
        this.node.emit('loaded', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.LOADED);
    }

    private _onReadyToPlay() {        
        this._updatePixelFormat();
        this._currentState = VideoState.PREPARED;
        if (this._seekTime > 0.1) {
            this.currentTime = this._seekTime;
        }
        this._updateTexture();
        
        this.node.emit('ready', this);
        EventHandler.emitEvents(this.videoPlayerEvent, this, EventType.READY);
        
        // 
        if (this._targetState == VideoState.PLAYING) {
            console.log('[video] ');
            this.play();
        }
    }

    public setTempSpriteActive(active: boolean) {
        this.tempSprite.node.active = active;
        this.videoOpacity.opacity = active ? 0 : 255;
        this._isTransitioning = active;
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
        
        // 
        if (!this._video || typeof this._video.getDatas !== 'function') {
            console.warn('[video] ');
            return;
        }
        
        try {
            let datas: any = this._video.getDatas();
            if (!datas || !datas.length) return;

            // 
            for (let i = 0; i < datas.length; i++) {
                if (!datas[i] || !(datas[i] instanceof Uint8Array || datas[i] instanceof Int8Array || 
                    datas[i] instanceof Uint16Array || datas[i] instanceof Int16Array ||
                    datas[i] instanceof Uint32Array || datas[i] instanceof Int32Array ||
                    datas[i] instanceof Float32Array || datas[i] instanceof Float64Array)) {
                    console.warn(`[video] ${i}`);
                    continue;
                }
            }

            // 
            // 
            if (datas.length > 0 && this._texture0 && this._texture0.isValid && !this._isTransitioning) {
                try {
                    this._texture0.uploadData(datas[0]);
                } catch (error) {
                    console.error('[video] texture0:', error);
                    return; // 
                }
            }
            
            if (datas.length > 1 && this._texture1 && this._texture1.isValid && !this._isTransitioning) {
                try {
                    this._texture1.uploadData(datas[1]);
                } catch (error) {
                    console.error('[video] texture1:', error);
                }
            }
            
            if (datas.length > 2 && this._texture2 && this._texture2.isValid && !this._isTransitioning) {
                try {
                    this._texture2.uploadData(datas[2]);
                } catch (error) {
                    console.error('[video] texture2:', error);
                }
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
        console.log(`[video] , : ${this._currentState}`);
        try
        {
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
        } catch (error) {
            console.error('[video] :', error);
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
        if (!this._video) {
            console.warn('[video] seek');
            this._seekTime = time;
            return;
        }
        
        this.pause();
        this._seekTime = time;
        
        if (this._isInPlaybackState()) {
            if (JSB) {
                this._video.seek(time);
            } else {
                this._video.currentTime = time;
            }
        }
        
        this.resume();
    }

    private _isInPlaybackState() {
        return !!this._video && this._currentState != VideoState.IDLE && this._currentState != VideoState.PREPARING && this._currentState != VideoState.ERROR;
    }

    public setRemoteSource(source: string) {
        console.log(`[video] setRemoteSource: ${source}, : ${this.source}, : ${this._currentState}`);
        
        // 
        if (!source || typeof source !== 'string') {
            console.error('[video] setRemoteSource: ');
            return;
        }
        
        const currentSource = this.source; 
        
        // 
        // 
        if (currentSource === source && this._currentState === VideoState.PLAYING && this._isInitialize) {
            console.log(`[video] : ${source}`);
            return;
        }
        
        // 
        this._isTransitioning = true;
        
        try {
            // VideoPlayerremoteURL
            if (this.VideoView) {
                this.VideoView.remoteURL = source;
            }
            
            this.clip = null!;
            this.source = source; // setter
            
            // 
            this.scheduleOnce(() => {
                try {
                    this._updateVideoSource();
                } catch (error) {
                    console.error('[video] :', error);
                    // 
                    this._isTransitioning = false;
                }
            }, 0.1); // 0.1
            
        } catch (error) {
            console.error('[video] setRemoteSource:', error);
            // 
            this._isTransitioning = false;
        }
    }



    /**
     * 
     * 
     */
    public dispose() {
        console.log(`[video] `);
        
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

    /**
     * _texture0tempSprite
     * _texture0_texture0
     * @returns {boolean} 
     */
    public copyCurrentFrameToSprite(): boolean {
        // 
        if (!this.tempSprite) {
            console.warn('[video] copy,tempSprite');
            return false;
        }
        
        if (!this._texture0 || !this._texture0.isValid) {
            console.warn('[video] copy,_texture0');
            return false;
        }
        
        if (!this._isInPlaybackState()) {
            console.warn('[video] copy,');
            return false;
        }

        const transform = this.tempSprite.node.getComponent(UITransform)!;
        transform.width = cc.winSize.width;
        transform.height = cc.winSize.height;
        this.setTempSpriteActive(true);

        try {
            console.log('[video] copy,tempSprite');
            
            // 
            const success = this._copyFrameByPixelFormat();
            
            if (success) {
                console.log('[video] tempSprite');
                return true;
            } else {
                console.warn('[video] copy,');
                return false;
            }
            
        } catch (error) {
            console.error('[video] copy,tempSprite:', error);
            return false;
        }
    }

    /**
     * 
     * @returns {boolean} 
     */
    private _copyFrameByPixelFormat(): boolean {
        // 
        const currentPixelFormat = JSB ? this._video.pixelFormat() : PixelFormat.RGB;
        if (currentPixelFormat == PixelFormat.NONE || currentPixelFormat == PixelFormat.I420) {
            console.warn(`[video] copy,:${currentPixelFormat}`);
            return false;
        }
        console.log(`[video] copy,: ${currentPixelFormat}`);
        
        if (JSB) {
            // 
            return this._copyFrameNativeByFormat(currentPixelFormat);
        } else {
            // video
            return this._copyFrameBrowser();
        }
    }

    /**
     * 
     * @param pixelFormat 
     * @returns {boolean} 
     */
    private _copyFrameNativeByFormat(pixelFormat: PixelFormat): boolean {
        try {
            switch (pixelFormat) {
                case PixelFormat.RGB:
                case PixelFormat.RGBA:
                    return this._copySimpleFormat(pixelFormat);
                
                case PixelFormat.I420:
                    return this._copyYUVFormat('I420');
                
                case PixelFormat.NV12:
                    return this._copyYUVFormat('NV12');
                
                case PixelFormat.NV21:
                    return this._copyYUVFormat('NV21');
                
                default:
                    console.warn(`[video] copy,: ${pixelFormat}`);
                    // RGB
                    return this._copySimpleFormat(PixelFormat.RGB);
            }
        } catch (error) {
            console.error('[video] copy,:', error);
            return false;
        }
    }

    /**
     * RGB/RGBA
     * @param pixelFormat 
     * @returns {boolean} 
     */
    private _copySimpleFormat(pixelFormat: PixelFormat): boolean {
        // 
        const copiedTexture = new Texture2D();
        
        // 
        copiedTexture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
        copiedTexture.setMipFilter(Texture2D.Filter.LINEAR);
        copiedTexture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        
        // 
        let textureFormat: gfx.Format;
        if (pixelFormat === PixelFormat.RGBA) {
            textureFormat = gfx.Format.RGBA8;
        } else {
            textureFormat = JSB ? gfx.Format.R8 : gfx.Format.RGB8;
        }
        
        // 
        copiedTexture.reset({
            width: this._texture0.width,
            height: this._texture0.height,
            format: textureFormat as any
        });
        
        // 
        this._copyTextureDataNative(copiedTexture);
        
        // tempSpriteSpriteFrame
        if (!this.tempSprite.spriteFrame) {
            this.tempSprite.spriteFrame = new SpriteFrame();
        }
        
        // tempSprite
        this.tempSprite.spriteFrame.texture = copiedTexture;
        
        // 
        this._setTempSpriteMaterial(pixelFormat);
        
        return true;
    }

    /**
     * YUVI420/NV12/NV21
     * @param formatName 
     * @returns {boolean} 
     */
    private _copyYUVFormat(formatName: string): boolean {
        console.log(`[video] copy,YUV: ${formatName}`);
        
        // YUVRGB
        // RT
        const copiedTexture = new Texture2D();
        
        copiedTexture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
        copiedTexture.setMipFilter(Texture2D.Filter.LINEAR);
        copiedTexture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        
        // YUVRGBRGBA
        copiedTexture.reset({
            width: this._texture0.width,
            height: this._texture0.height,
            format: gfx.Format.RGBA8 as any
        });
        
        // YUVGPU
        // Y
        // YUVRGB shader
        this._copyTextureDataNative(copiedTexture);
        
        // tempSpriteSpriteFrame
        if (!this.tempSprite.spriteFrame) {
            this.tempSprite.spriteFrame = new SpriteFrame();
        }
        
        this.tempSprite.spriteFrame.texture = copiedTexture;
        
        // RGB
        this._setTempSpriteMaterial(PixelFormat.RGBA);
        
        return true;
    }

    /**
     * 
     * @returns {boolean} 
     */
    private _copyFrameBrowser(): boolean {
        // _texture0video
        if (!this._video) {
            throw new Error('');
        }
        
        // 
        const copiedTexture = new Texture2D();
        
        // 
        copiedTexture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
        copiedTexture.setMipFilter(Texture2D.Filter.LINEAR);
        copiedTexture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        
        // RGB
        copiedTexture.reset({
            width: this._video.videoWidth || this.width,
            height: this._video.videoHeight || this.height,
            format: gfx.Format.RGB8 as any
        });
        
        // 
        this._copyTextureDataBrowser(copiedTexture);
        
        // tempSpriteSpriteFrame
        if (!this.tempSprite.spriteFrame) {
            this.tempSprite.spriteFrame = new SpriteFrame();
        }
        
        // tempSprite
        this.tempSprite.spriteFrame.texture = copiedTexture;
        
        // RGB
        this._setTempSpriteMaterial(PixelFormat.RGB);
        
        return true;
    }

    /**
     * tempSprite
     * @param pixelFormat 
     */
    private _setTempSpriteMaterial(pixelFormat: PixelFormat): void {
        // tempSpriteSpriteindex=1
        const materialIndex = 1;
        
        try {
            switch (pixelFormat) {
                case PixelFormat.RGB:
                    if (this.rgb && this.rgb[materialIndex]) {
                        this.tempSprite.setMaterial(this.rgb[materialIndex], 0);
                    }
                    break;
                case PixelFormat.RGBA:
                    if (this.rgba && this.rgba[materialIndex]) {
                        this.tempSprite.setMaterial(this.rgba[materialIndex], 0);
                    }
                    break;
                case PixelFormat.I420:
                    if (this.i420 && this.i420[materialIndex]) {
                        this.tempSprite.setMaterial(this.i420[materialIndex], 0);
                    }
                    break;
                case PixelFormat.NV12:
                    if (this.nv12 && this.nv12[materialIndex]) {
                        this.tempSprite.setMaterial(this.nv12[materialIndex], 0);
                    }
                    break;
                case PixelFormat.NV21:
                    if (this.nv21 && this.nv21[materialIndex]) {
                        this.tempSprite.setMaterial(this.nv21[materialIndex], 0);
                    }
                    break;
                default:
                    console.warn(`[video] copy,: ${pixelFormat}`);
                    break;
            }
            
            console.log(`[video] copy,tempSprite: ${pixelFormat}`);
        } catch (error) {
            console.error('[video] copy,tempSprite:', error);
        }
    }
    
    /**
     * 
     * @param targetTexture 
     */
    private _copyTextureDataNative(targetTexture: Texture2D): void {
        // directordevice
        if (!director.root || !director.root.device) {
            throw new Error('director.root  device ');
        }
        
        // 
        if (!targetTexture || !targetTexture.isValid) {
            throw new Error('');
        }
        
        // 
        if (!this._texture0 || !this._texture0.isValid) {
            throw new Error('');
        }
        
        const device = director.root.device;
        const sourceTexture = this._texture0.getGFXTexture();
        
        if (!sourceTexture) {
            throw new Error('GFX');
        }
        
        // 
        if (sourceTexture.width <= 0 || sourceTexture.height <= 0) {
            throw new Error('');
        }
        
        // 
        const maxTextureSize = 4096; // 
        if (sourceTexture.width > maxTextureSize || sourceTexture.height > maxTextureSize) {
            throw new Error(`: ${sourceTexture.width}x${sourceTexture.height}`);
        }
        
        // buffer
        const textureSize = sourceTexture.size;
        if (textureSize <= 0 || textureSize > 100 * 1024 * 1024) { // 100MB
            throw new Error(`: ${textureSize}`);
        }
        
        const tempBuffer = new Uint8Array(textureSize);
        
        // 
        const copyRegion = new gfx.BufferTextureCopy();
        copyRegion.texExtent.width = sourceTexture.width;
        copyRegion.texExtent.height = sourceTexture.height;
        copyRegion.texSubres.mipLevel = 0;
        copyRegion.texSubres.baseArrayLayer = 0;
        
        try {
            // buffer
            device.copyTextureToBuffers(sourceTexture, [tempBuffer], [copyRegion]);
            
            // 
            if (targetTexture && targetTexture.isValid) {
                // buffer
                targetTexture.uploadData(tempBuffer);
            } else {
                console.warn('[video] ');
            }
        } catch (error) {
            console.error('[video] :', error);
            throw error;
        }
    }
    
    /**
     * 
     * @param targetTexture 
     */
    private _copyTextureDataBrowser(targetTexture: Texture2D): void {
        // _texture0video
        if (!this._video) {
            throw new Error('');
        }
        
        // canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('canvas');
        }
        
        // canvas
        canvas.width = this._video.videoWidth || this.width;
        canvas.height = this._video.videoHeight || this.height;
        
        // canvas
        ctx.drawImage(this._video, 0, 0, canvas.width, canvas.height);
        
        // ImageData
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // ImageData
        targetTexture.uploadData(imageData.data);
        
        // canvas
        canvas.remove();
    }

    /**
     * 
     * @returns {boolean} 
     */
    private _isVideoStateSafe(): boolean {
        // 
        if (!this.node || !this.node.isValid) {
            console.warn('[video] ');
            return false;
        }
        
        // 
        if (this._isTransitioning) {
            console.warn('[video] ');
            return false;
        }
        
        // 
        if (!this._video) {
            console.warn('[video] ');
            return false;
        }
        
        // 
        if (!this._texture0 || !this._texture0.isValid) {
            console.warn('[video] ');
            return false;
        }
        
        // 
        if (this._currentState === VideoState.IDLE || 
            this._currentState === VideoState.ERROR ||
            this._currentState === VideoState.PREPARING) {
            console.warn(`[video] : ${this._currentState}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * 
     * @param operation 
     * @returns {boolean} 
     */
    private _safeTextureOperation(operation: () => void): boolean {
        if (!this._isVideoStateSafe()) {
            return false;
        }
        
        try {
            operation();
            return true;
        } catch (error) {
            console.error('[video] :', error);
            // 
            this._currentState = VideoState.ERROR;
            return false;
        }
    }
}

