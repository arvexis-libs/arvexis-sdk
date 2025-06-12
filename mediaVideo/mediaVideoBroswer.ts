import { _decorator, Component, VideoClip, RenderableComponent, Texture2D, loader, EventHandler, game, Game, Material, Sprite, SpriteFrame, gfx, VideoPlayer } from 'cc';
import { EventType, PixelFormat, ReadyState, VideoState } from './mediaVideoBase';
const { ccclass, property} = _decorator;





@ccclass('MediaVideoBroswer')
export class MediaVideoBroswer extends Component {

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

    @property(Sprite)
    private sprite: Sprite = null!;

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
    

    // current position of the video which is playing
    get currentTime() {
        if (!this._video) return 0;
        if (this._isInPlaybackState()) {
            return this._video.currentTime;
        } else {
                return this._seekTime;
        }
    }
    
    // seek to position
    set currentTime(value: number) {
        if (!this._video) return;
        if (this._isInPlaybackState()) {
            this._video.currentTime = value;
        } else {
            this._seekTime = value;
        }
    }
    
        // duration of the video
    get duration(): number {
        if (!this._video) return 0;
        if (this._nativeDuration > 0) return this._nativeDuration;
        let duration = this._video.duration;
        this._nativeDuration = isNaN(duration) ? 0 : duration;
        return this._nativeDuration;
    }
    
    get width(): number {
        if (!this._isInPlaybackState()) return 0;
        if (this._nativeWidth > 0) return this._nativeWidth;
        let width = this._video.videoWidth;
        this._nativeWidth = isNaN(width) ? 0 : width;
        return this._nativeWidth;
    }
    
    get height(): number {
        if (!this._isInPlaybackState()) return 0;
        if (this._nativeHeight > 0) return this._nativeHeight;
        let height = this._video.videoHeight;
        this._nativeHeight = isNaN(height) ? 0 : height;
        return this._nativeHeight;
    }
    
    // not accurate because native event is async, larger than actual percentage.
    get bufferPercentage(): number {
        if (!this._video) return 0;
        return 0;
    }

    private _isInitialize: boolean = false;

    start() {
        this.render = (this.sprite as any) as RenderableComponent;
    }

    public tryInitializeRemote(source: string) {
        if(!this._isInitialize){
            this.clip = null!;
            this._source = source;
            
            // 
            this._targetState = VideoState.PLAYING;
            
            this._initialize();
            this._isInitialize = true;
        }
    }

    /**
     * 
     */
    private _initialize() {
        this._initializeBrowser();
    }



    /**
     * initialize browser player, register video event handler
     */
     private _initializeBrowser(): void {
        console.log('[video] _initializeBrowser 1');
        // @ts-ignore
        this._video = this.VideoView._impl._video;
        console.log('[video] _initializeBrowser 2');
        this._video.crossOrigin = 'anonymous';
        console.log('[video] _initializeBrowser 3');
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
        console.log('[video] _initializeBrowser 3');
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
    private _updateVideoSource() {
        let url = '';
        if (this._source) {
            url = this._source;
        }
        if (this._clip) {
            url = this._clip.nativeUrl;
        }
        if (url && loader.md5Pipe) {
            url = loader.md5Pipe.transformURL(url);
        }

        console.log('[video] _updateVideoSource', url);
        this._loaded = false;
        
        // 
        const shouldAutoPlay = this._targetState === VideoState.PLAYING;
        
        this._video.pause();
        this._video.src = url;
        
        // 
        if (shouldAutoPlay) {
            this._targetState = VideoState.PLAYING;
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
        game.off(Game.EVENT_SHOW, this._onShow, this);
        game.off(Game.EVENT_HIDE, this._onHide, this);
        this.stop();
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
        if (this._isInPlaybackState()) {
            this._texture0.uploadData(this._video);
            this._updateMaterial();
        } 
    }



    /**
     * 
     */
    protected _updateMaterial(): void {
        let material = this.render.getMaterialInstance(0);
        if (material) {
            material.setProperty('texture0', this._texture0);
            switch (this._pixelFormat) {
                case PixelFormat.I420:
                    material.setProperty('texture2', this._texture2);
                // fall through
                case PixelFormat.NV12:
                case PixelFormat.NV21:
                    material.setProperty('texture1', this._texture1);
                    break;
            }
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
        texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
        texture.setMipFilter(Texture2D.Filter.LINEAR);
        texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
        

        texture.reset({
            width: width,
            height: height,
            //@ts-ignore
            format:  format ? format : gfx.Format.RGB8
        });
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
        if (this._targetState === VideoState.PLAYING) {
            console.log('[video] _onReadyToPlay: ');
            this.play();
        } else {
            console.log('[video] _onReadyToPlay: :', this._targetState);
        }
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
    }
    

    private _updatePixelFormat(): void {
        let index: number = this.render instanceof Sprite ? 1 : 0; 
        // RGB
        let pixelFormat = PixelFormat.RGB;
        if (this._pixelFormat == pixelFormat) return;
        this._pixelFormat = pixelFormat;
        this.render.setMaterial(this.rgb[index], 0);
    }

    /**
     * 
     */
     public play() {
        console.log(`[video] play() , : ${this._currentState}, : ${this._targetState}, : ${this._isInPlaybackState()}`);
        
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
                console.log('[video] play() ');
            } else {
                console.log('[video] play() ');
            }
        } else {
            console.log('[video] play() ');
            this._targetState = VideoState.PLAYING;
        }
    }

    /**
     * 
     */
    public resume() {
        if (this._isInPlaybackState() && this._currentState != VideoState.PLAYING) {
            this._video.play();
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
            // if (JSB) {
            //     // this._video.stop();
            // } else {
            //     this._video.pause();
            //     this._video.currentTime = 0;
            // }
            this._video.pause();
            this._video.currentTime = 0;

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
        this._video.volume = volume;
    }

    public clear() {

    }

    /**
     * 
     * @returns 
     */
    public isPlaying() {
        return this._currentState == VideoState.PLAYING || this._targetState == VideoState.PLAYING;
    }

    private _isInPlaybackState() {
        const result = !!this._video && this._currentState != VideoState.IDLE && this._currentState != VideoState.PREPARING && this._currentState != VideoState.ERROR;
        console.log(`[video] _isInPlaybackState: video=${!!this._video}, currentState=${this._currentState}, result=${result}`);
        return result;
    }

    /**
     * 
     */
    public debugVideoState() {
        console.log(`[video] :`);
        console.log(`  - : ${!!this._video}`);
        console.log(`  - : ${this._currentState}`);
        console.log(`  - : ${this._targetState}`);
        console.log(`  - : ${this._loaded}`);
        console.log(`  - : ${this._isInPlaybackState()}`);
        if (this._video) {
            console.log(`  - readyState: ${this._video.readyState}`);
            console.log(`  - paused: ${this._video.paused}`);
            console.log(`  - ended: ${this._video.ended}`);
        }
    }

    public setRemoteSource(source: string) {
        this.clip = null!;
        this._source = source;
        
        // 
        const wasPlaying = this._currentState === VideoState.PLAYING;
        
        // 
        this._currentState = VideoState.IDLE;
        this._loaded = false;
        
        this._updateVideoSource();
        
        // 
        if (wasPlaying) {
            this._targetState = VideoState.PLAYING;
        }
    }
}

