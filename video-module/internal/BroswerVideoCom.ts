import { _decorator, VideoPlayer } from 'cc';
import { VideoCom } from '../VideoCom';
import { EVideoType, IVideoParam } from '../VideoEnum';
import { UITransform } from 'cc';
import { VideoClip } from 'cc';
import { EventHandler } from 'cc';
import { UIOpacity } from 'cc';
import { EventType, getEventName } from '../../mediaVideo/mediaVideoBase';
import { UIMainVideoComp } from '../../../game/UIMainVideo/UIMainVideoComp';
import { MediaVideoBroswer } from '../../mediaVideo/mediaVideoBroswer';
const { ccclass, property } = _decorator;

@ccclass('BroswerVideoCom')
export class BroswerVideoCom extends VideoCom {


    @property(VideoPlayer)
    mVideoPlayer:VideoPlayer = null!

    @property(MediaVideoBroswer)
    mediaVideo: MediaVideoBroswer = null!;

    @property(UIOpacity)
    uiOpacity: UIOpacity = null!;

    @property(UITransform)
    videoTransform: UITransform = null!

    @property(Boolean)
    isInited: boolean = false;

    protected onLoad(): void {
        this.mPosterWidgetHigh = true;
    }


    play(param: IVideoParam): void {
        super.play(param);
        this.tryInit();

        let poster = param.poster ? param.poster : null;
        this.mVideoPlayer.fullScreenOnAwake = true;
        // this.mVideoPlayer.stayOnBottom = true;
        this.mVideoPlayer.resourceType = param.resourceType == EVideoType.Remote ? VideoPlayer.ResourceType.REMOTE : VideoPlayer.ResourceType.LOCAL;
        if(param.resourceType == EVideoType.Local){

            console.log(`[video] , src: ${param.src}`);
            this.loadAsync("InnerVideo", param.src, VideoClip).then((clip)=>{
                this.mVideoPlayer.clip = clip;
            })
        }
        else{
            // VideoPlayerremoteURL
            this.mediaVideo.tryInitializeRemote(param.src);
            this.mediaVideo.setRemoteSource(param.src);
        }
        this.mediaVideo.loop = param.loop;
        UIMainVideoComp.getInstance().fadeinVideo();
    }

    onEventHandler(event: EventHandler, eventType: EventType){
        console.log(`[video] BroswerVideoCom onEventHandle, eventType:${getEventName(eventType)}. :${this.uiOpacity.opacity}`);
        
        // 
        if (this.mediaVideo) {
            this.mediaVideo.debugVideoState();
        }
        
        switch(eventType){
            case EventType.PREPARING:
                console.log('[video] ...');
                break;
            case EventType.LOADED:
                console.log('[video] ');
                if (this.uiOpacity.opacity == 0) {
                    this.uiOpacity.opacity = 255;
                    UIMainVideoComp.getInstance().fadeinVideo();
                }
                // LOADED
                console.log('[video] LOADEDmediaVideo.play()');
                this.mediaVideo.play();
                break;
            case EventType.STOPPED:
                console.log('[video] ');
                this.uiOpacity.opacity = 0;
                this.onStopped();
                break;
            case EventType.PLAYING:
                console.log('[video] ');
                if (this.uiOpacity.opacity == 0) {
                    this.uiOpacity.opacity = 255;
                    UIMainVideoComp.getInstance().fadeinVideo();
                }
                UIMainVideoComp.getInstance().onVideoPlayStart(this.mParam);
                break;
            case EventType.ERROR:
                console.log('[video] ');
                this.uiOpacity.opacity = 0;
                break;
            case EventType.COMPLETED:
                console.log('[video] ');
                this.uiOpacity.opacity = 0;
                UIMainVideoComp.getInstance().fadeoutVideo();
                UIMainVideoComp.getInstance().Close();
                break;
        }
    }

    tryInit(){
        if(this.isInited) return;
        console.log(`[video]: ${cc.winSize.width}, : ${cc.winSize.height}`);
        this.videoTransform.width = cc.winSize.width;
        this.videoTransform.height = cc.winSize.height;

        this.mediaVideo.node.active = true;
        this.mVideoPlayer.node.active = true;
        this.isInited = true;
    }

    stop(){
        super.stop();
        this.mediaVideo.stop();
        this.onStopped();
    }

    onStopped(): void {
        super.onStopped();
    }

    onCompleted(): void {
        super.onCompleted();
    }


    start() {

    }

    update(deltaTime: number) {
        
    }

    protected onDestroy(): void {
        super.onDestroy();
        console.log('[video] BroswerVideoCom onDestroy ');
        
        // 
        if (this.mediaVideo) {
            this.mediaVideo.stop();
            // MediaVideoBroswerdispose
        }
        
        console.log('[video] BroswerVideoCom onDestroy ');
    }


    seek(time: number): void {
        // MediaVideoBroswerseekcurrentTime
        this.mediaVideo.currentTime = time;
    }
    
    getDuration(): number{
        return this.mediaVideo.duration;
    }

    getCurrentTime(): number{
        return this.mediaVideo.currentTime;
    }
}