import * as fs from "fs"
import { dataClient, mainClient, resetClientParams, sendDataSplitSize, userId } from "./clientMain"
import { setFormat } from "../protocol/sendFormat"
import { readRateAniRun } from "./textLog"
let splitDataList:any[] = []

let fileFd:any = undefined
let splitDataCounter:number = 0
let splitNum:number = 0
let rastPacketSize:number = 0
let fileSize:number = 0
export let nowSendedSize:number = 0
const openFile = (path:string)=>{
    fs.open(path,"r",(err,fd)=>{
        fileFd = fd
        fileSize = fs.statSync(path).size
        splitNum = Math.ceil(fileSize/sendDataSplitSize)
        rastPacketSize = fileSize%sendDataSplitSize
        mainClient.write(setFormat("send_rast_packet_size","mainClient",{rastPacketSize:rastPacketSize,splitDataListLength:splitNum}))
        readRateAniRun("Uploading file",fileSize,"upload")
    })
}

export const firstSendSetting = (dataPath:string)=>{
    openFile(dataPath)
}

export const NextSendFile = ()=>{
    let buffer = Buffer.alloc(sendDataSplitSize)
    if (splitDataCounter+1 !== splitNum){
        fs.read(fileFd,buffer,0,sendDataSplitSize,splitDataCounter*sendDataSplitSize,(err, bytesRead, buffer)=>{
            sendData(buffer)
            nowSendedSize = splitDataCounter*sendDataSplitSize
        })
    }else{
        buffer = Buffer.alloc(rastPacketSize)
        fs.read(fileFd,buffer,0,rastPacketSize,splitDataCounter*sendDataSplitSize,(err, bytesRead, buffer)=>{
            sendData(buffer)
            nowSendedSize = fileSize
            resetClientParams()
            // mainClient.write(setFormat("done_rast_logic","mainClient","mainClient"))
            // mainClient.write(setFormat("","mainClient","reset_logic"))
            // dataClient.write(setFormat("","mainClient","reset_logic"))
        })
    }
}

export const sendData = (data:any)=>{
    dataClient.write(data)
    splitDataCounter+=1
}

export const resetParams = ()=>{
    nowSendedSize = 0
    fileFd = undefined
    splitDataCounter = 0
    splitNum = 0
    rastPacketSize = 0
    fileSize = 0
}