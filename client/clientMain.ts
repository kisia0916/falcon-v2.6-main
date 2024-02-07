import * as net from "net"
import * as fs from "fs"
import { setFormat } from "../protocol/sendFormat"
import { NextSendFile, firstSendSetting, resetParams} from "./sendFile"
import { loadTextAniRun, rastLoadWrite, readRateAniRun } from "./textLog"
import { getInput } from "./dataInput"
import { clientList } from "../server/serverMain"

export const mainClient = new net.Socket()
export const dataClient = new net.Socket()

// const HOST = "0.tcp.jp.ngrok.io"
// const PORT = 10280
const HOST = "localhost"
const PORT = 3000
let sendFile:string = "./testFiles/sendData.exe"
let writeFile:string = "./testFiles/getData.exe"


interface getDataInterFace{
    type:string,
    sendFrom:string
    data:any
}
interface targetsInfoInterface {
    mainTarget:string,
    subTarget:string,
}

export let userId:string = ""
let targetsInfo:targetsInfoInterface = {mainTarget:"",subTarget:""}//mainは自分から接続しに行ったクライアントでsubは相手から接続してきたクライアント

export const sendDataSplitSize = 102400
export let rastPacketSize:number = 0
export let splitDataListLength:number = 0
export let packetCounter:number = 0
export let systemMode:"upload"|"download"|undefined = undefined
let doneLogicCounter:number = 0
let getCmd:any = ""
let cmdList = []

mainClient.on("data",async(data:string)=>{
    let getData:any = ""
    try{
        getData = JSON.parse(data)
    }catch{
        let data2 = Buffer.from(data,"utf-8")
        console.log(data2.toString("utf-8"))
    }
    if (getData.type === "first_send"){
        mainClient.write(setFormat("send_client_info","mainClient",{data:"mainClient",systemMode:systemMode}))
    }else if (getData.type === "send_server_userId"){
        userId = getData.data
        console.log(`my userId is ${userId}`)
        //本番ではここを標準入力にする
        targetsInfo.mainTarget = fs.readFileSync("./testFiles/target.txt","utf-8")
        if (targetsInfo.mainTarget){
            //console.log("ターゲットを読み込みました")
            mainClient.write(setFormat("send_main_target","mainClient",{mainTarget:targetsInfo.mainTarget}))
        }else{
            //ターゲットがないときにdataClientを接続させる
            dataClient.connect(PORT,HOST,()=>{
                //console.log("dataClient connected server!")
            })
        }
        /////
    }else if (getData.type === "send_conection_reqest_mainTarget"){
        targetsInfo.subTarget = getData.data
        //console.log("reqestを受け取りました")
        mainClient.write(setFormat("done_connection_mainTarget","mainClient",targetsInfo.subTarget))
    }else if (getData.type === "connection_mainTarget_dataClient"){
        dataClient.connect(PORT,HOST,()=>{
            //console.log("dataClient connected server!")
        })
    }else if (getData.type === "set_system_mode_2"){
        systemMode = getData.data
        mainClient.write(setFormat("done_set_all_systemMode","mainClient",getData.data))
    }else if (getData.type === "done_all_logic"){
        doneLogicCounter+=1
        //console.log(`${doneLogicCounter}`+"unnko")
        if (doneLogicCounter === 2){
            //console.log("all logic done")
            let rastText:string = ""
            if (systemMode === "upload"){
                rastText = "Uploading file"
            }else{
                rastText = "Downloading file"
            }
            rastLoadWrite(rastText)
            systemMode = undefined
            getCmd = await getInput("コマンド入れてちょ：")
            cmdList = getCmd.split(" ")
            if (cmdList[0] === "upload"){
                systemMode = "upload"
                dataClient.write(setFormat("set_change_flg_sec","dataClient",systemMode))
            }else if (cmdList[0] === "download"){
                systemMode = "download"
                dataClient.write(setFormat("set_change_flg_sec","dataClient",systemMode))
            }
            getCmd = ""
            cmdList = []
            doneLogicCounter = 0
        }
    }else if (getData.type === "set_change_flg_sec_client"){
        // dataClientFirstFlg = false
        dataClient.write(setFormat("set_change_flg_sec_server","server","set"))
    }else if (getData.type === "set_data_change_flg_sec_client"){
        dataClientFirstFlg = false
        //console.log("下田")
        dataClient.write(setFormat("set_change_flg_sec_server","server","data_change"))
    }else if (getData.type === "all_set_changeFlg"){
        // dataClientFirstFlg = false
        //console.log("all flg change done")
        mainClient.write(setFormat("set_system_mode_1","mainClient",{systemMode:systemMode,targetsInfo:targetsInfo}))
    }else if (getData.type === "done_rast_logic_1"){
        dataClient.write(setFormat("done_rast_logic","dataClient","dataClient"))
    }
    else if (systemMode === "upload"){
        if (getData.type === "start_upload"){
            //console.log("リクエストが成功しました")
        }else if (getData.type === "send_next_reqest"){
            NextSendFile()
        }else if (getData.type === "send_rast_packet_size_mainTarget"){
            rastPacketSize = getData.data.rastPacketSize
            splitDataListLength = getData.data.splitDataListLength
            //console.log(`rast packet size is ${rastPacketSize}`)
            mainClient.write(setFormat("start_send_packet","mainClient","done"))
        }else if (getData.type === "start_send_packet_2"){
            NextSendFile()
        }else if (getData.type === "done_set_all_systemMode_2"){
            //console.log("動いてはいる")
            mainClient.write(setFormat("start_upload_settings","mainClient","start"))
        }
    }else if (systemMode === "download"){
        if (getData.type === "start_download"){
            //console.log("downloadを開始します")
            dataClient.connect(PORT,HOST,()=>{
                //console.log("dataClient connected server!")
            })
        }else if (getData.type === "send_download_path_sub"){
            sendFile = getData.data
            //console.log("downloadのファイル送信の準備開始")
            firstSendSetting(sendFile)

        }else if (getData.type === "send_rast_packet_size_subTarget"){
            //console.log(getData.data)
            rastPacketSize = getData.data.rastPacketSize
            splitDataListLength = getData.data.splitDataListLength
            //console.log(`rast packet size is ${rastPacketSize}`)
            mainClient.write(setFormat("start_send_packet","mainClient","done"))
        }else if (getData.type === "start_send_packet_2"){
            //console.log(targetsInfo)
            //console.log("うけとり")
            NextSendFile()
        }else if (getData.type === "send_next_reqest"){
            NextSendFile()
        }else if (getData.type === "done_set_all_systemMode_2"){
            //console.log("動いてはいる2")
            mainClient.write(setFormat("start_download_settings","mainClient","start"))
        }
    }
})

let dataClientFirstFlg:boolean = true
let getDataCacheList:any[] = []
export let nowCatchSize:number = 0
dataClient.on("data",async(data:string)=>{
    let getData:getDataInterFace;
    if (dataClientFirstFlg){
        getData = JSON.parse(data)
        if (getData.type === "first_send"){
            //console.log("firstsendを取得しました")
            //console.log(userId)
            let changeFlg :boolean = false
            dataClient.write(setFormat("send_client_info","dataClient",{data:"dataClient",userId:userId,systemMode:systemMode}))
        }else if (getData.type === "conection_done_dataClient"){
            //console.log("現況")
            //console.log(systemMode)
            if (systemMode === "upload"){
                if (targetsInfo.mainTarget){
                    //console.log("startうｐ")
                    firstSendSetting(sendFile)   
                }
            }else if (systemMode === "download"){
                mainClient.write(setFormat("send_download_path_main","mainClient",sendFile))
            }
            dataClientFirstFlg = false//ここでもうjsonデータは受け取れなくなる
        }else if (getData.type === "testsig"){

            if (targetsInfo.mainTarget){
                getCmd = await getInput("コマンド入れてちょ：")
                cmdList = getCmd.split(" ")
                if (cmdList[0] === "upload"){
                    systemMode = "upload"
                    dataClient.write(setFormat("set_change_flg_sec","dataClient",systemMode))
                }else if (cmdList[0] === "download"){
                    systemMode = "download"
                    dataClient.write(setFormat("set_change_flg_sec","dataClient",systemMode))
                }
                getCmd = ""
                cmdList = []
            }
        }else if (getData.type === "set_done_change_flg"){
            if (systemMode === "upload"){
                mainClient.write(setFormat("set_system_mode_1","mainClient",{systemMode:getData.data}))
            }else if (systemMode === "download"){
                dataClientFirstFlg = false
                mainClient.write(setFormat("set_system_mode_1","mainClient",{systemMode:getData.data,targetsInfo:targetsInfo}))
            }
        }
    }else{
        //console.log("subTargetからデータを受け取りました")
        //console.log(Buffer.isBuffer(data))
        getDataCacheList.push(data)
        // console.log(Buffer.concat(getDataCacheList).length)
        //console.log(Buffer.concat(getDataCacheList).length)

        // console.log(packetCounter+"/"+splitDataListLength)
        if (packetCounter+1 !== splitDataListLength){
            if (Buffer.concat(getDataCacheList).length === sendDataSplitSize){
                if (packetCounter === 0){
                    readRateAniRun("Downloading file",splitDataListLength-1,"download")
                }
                fs.appendFile(writeFile,Buffer.concat(getDataCacheList),(error)=>{

                    //console.log("書き込み完了")
                    nowCatchSize = Buffer.concat(getDataCacheList).length
                    mainClient.write(setFormat("done_write_mainTargetFile","mainClient","done"))
                    getDataCacheList = []
                    packetCounter+=1
                })

            }
        }else{
            if (Buffer.concat(getDataCacheList).length === rastPacketSize){
                
                fs.appendFile(writeFile,Buffer.concat(getDataCacheList),(error)=>{
                    //console.log("最後のパケットを書き込みました")
                    // mainClient.write(setFormat("done_write_mainTargetFile","dataClient","done"))
                    getDataCacheList = []
                    packetCounter+=1
                    resetClientParams()
                    mainClient.write(setFormat("done_rast_logic","mainClient","mainClient"))
                    // mainClient.write(setFormat("","mainClient","reset_logic"))
                    // dataClient.write(setFormat("","mainClient","reset_logic"))
                })

            }
        }
    }
})
export const resetClientParams = ()=>{
    packetCounter = 0
    rastPacketSize = 0
    splitDataListLength = 0
    // if (!targetsInfo.mainTarget){
    systemMode = undefined
    // }
    dataClientFirstFlg = true
    resetParams()
}
export let doneConnectionFlg:boolean = false
loadTextAniRun(`Connecting to ${HOST}:${PORT}`)
mainClient.connect(PORT,HOST,()=>{
    doneConnectionFlg = true
    //console.log(`${"Connecting to localhost:3000"}`+"\x1b[32m done"+"\x1b[39m")
})
