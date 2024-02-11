import { doneConnectionFlg, packetCounter } from "./clientMain";
import { nowSendedSize } from "./sendFile";

process.stdout.write( "\x1b[?25l" );
process.on("exit", ()=>process.stdout.write( "\x1b[?25h" ));
process.on("SIGINT", ()=>process.exit(0));

//
let loadContents = [ "｜","／","―","＼"];
let loadContentsCounter = 0
const loadTextAni = (beforeText:string,done:boolean)=>{
    if (!done){
        process.stdout.write(`${beforeText}${loadContents[loadContentsCounter]}\r`)
        loadContentsCounter+=1
        if (loadContentsCounter === loadContents.length){
            loadContentsCounter = 0
        }
    setTimeout(()=>loadTextAniRun(beforeText),40)
    }
}
export const loadTextAniRun = (beforeText:string)=>{
    setTimeout(()=>loadTextAni(beforeText,doneConnectionFlg),40)
}
//
const loadBoxNum = 20
let maxSizeMain = 0
let beforePa:number = 0
let beforeTextBack:string = ""
// let nowContentSize = 0
const readRateAni = (beforeText:string)=>{
    let nowContentSize = nowSendedSize
    const nowRate = Math.ceil((nowContentSize/maxSizeMain)*100)
    let writeBox = ""
    if (maxSizeMain+1>=nowContentSize){
        for (let i = 0;loadBoxNum>i;i++){
            if (i+1 <=(nowRate/10)*(loadBoxNum/10)){
                writeBox+="■"
            }else{
                writeBox+="□"
            }
        }
    }
    if ((nowRate === 0 && beforePa === 100) === false){
        if (maxSizeMain>nowContentSize){
            process.stdout.write(`${beforeText} [${writeBox}]${nowRate}%\r`)
            setTimeout(()=>readRateAni(beforeText),10)
        }else if (nowContentSize>=maxSizeMain){
            nowContentSize+=1
        }
    }
    beforePa = nowRate
}

const readRateAni2 = (beforeText:string)=>{

    let nowContentSize = packetCounter
    const nowRate = Math.ceil((nowContentSize/maxSizeMain)*100)
    let writeBox = ""
    if (maxSizeMain+1>=nowContentSize){
        for (let i = 0;loadBoxNum>i;i++){
            if (i+1 <=(nowRate/10)*(loadBoxNum/10)){
                writeBox+="■"
            }else{
                writeBox+="□"
            }
        }
    }
    if ((nowRate < beforePa) === false){
        if (maxSizeMain>nowContentSize){
            process.stdout.write(`${beforeText} [${writeBox}]${nowRate}%\r`)
            setTimeout(()=>readRateAni2(beforeText),10)
        }else if (nowContentSize>=maxSizeMain){
            nowContentSize+=1
        }
    }
    beforePa = nowRate
}


export const rastLoadWrite = (beforeText:string)=>{
    let box:string = ""
    for (let i = 0;loadBoxNum>i;i++){
        box+="■"
    }
    console.log(`${beforeTextBack}ing file [${box}]100%`)
    console.log(`\x1b[32m${beforeTextBack} done!`+"\x1b[39m")
    beforeTextBack = ""
}

export const readRateAniRun = (beforeText:string,maxSize:number,systemMode:"upload"|"download")=>{
    maxSizeMain = maxSize
    beforePa = 0
    beforeTextBack = systemMode
    if (systemMode === "upload"){
        setTimeout(()=>readRateAni(beforeText),10)
    }else if (systemMode === "download"){
        setTimeout(()=>readRateAni2(beforeText),10)
    }
}
// readRateAniRun("lll")
// loadTextAniRun("loading...")