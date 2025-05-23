import { DEBUG } from "cc/env";

export class Global{
    static checkInternal(className:string[]):boolean{
        if(DEBUG){
            // 
            const stack = new Error().stack;
            for(let i=0;i<className.length;i++){
                if(stack?.includes(className[i])){
                    throw new Error(' InternalService');
                }
            }
        }
        return true;
    }
}


