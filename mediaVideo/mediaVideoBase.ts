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

export enum VideoState {       //
    ERROR = -1,         //    
    IDLE = 0,           // 
    PREPARING = 1,      //
    PREPARED = 2,       //
    PLAYING = 3,        //
    PAUSED = 4,         //
    STOP = 5,           //
    COMPLETED = 6       //
};

export enum ReadyState {       //
    HAVE_NOTHING = 0,       
    HAVE_METADATA = 1,
    HAVE_CURRENT_DATA = 2,
    HAVE_FUTURE_DATA = 3,
    HAVE_ENOUGH_DATA = 4    
};

export enum PixelFormat {  //
    NONE = -1,      
    I420 = 0,        //yuv
    RGB = 2,        //rgb
    NV12 = 23,      //nv12
    NV21 = 24,      //nv21
    RGBA = 26       //rgba
};

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