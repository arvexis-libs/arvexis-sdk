
export interface IVideoParam{
    videoid:number,
    resourceType:EVideoType,    // 
    src :string,
    controls :boolean
    progress :boolean
    progressInControlMode :boolean
    autoplay :boolean
    playBtn :boolean
    underGame :boolean //wx
    loop :boolean
    width :number
    height :number
    objectFit :string
    poster :string,
    posterBundle:string,
    readyToPlayCallback?: Function
    stopedCallback?: Function
    completeCallback?: Function
    callThisArgs?: any
}

export enum EVideoType{
    Remote = 0,
    Local = 1,
}