import * as net from "net"
import * as fs from "fs"
import * as uuid from "uuid"
import { setFormat } from "../protocol/sendFormat"
import { dataClientFun } from "./dataClientFuns"

const PORT = 3000

const server = net.createServer()

interface clientListInterface {
    userId:string,
    mainClientSocket:any,
    dataClientSocket:any,
    targetInfo:targetsInfoInterface
    rastPacketInfo:rastPacketInfoInterface,
    systemMode:"upload"|"download"|""
}
export interface targetsInfoInterface {
    mainTarget:string,
    subTarget:string,
}

export interface rastPacketInfoInterface {
    rastPacketSize:number,
    splitDataListLength:number,
}

export let clientList:clientListInterface[] = []
export const sendDataSplitSize = 102400

server.on("connection",(socket)=>{
    let userId:string = ""
    let clientType:string = ""
    let mainClientId:string = ""//dataClientがmainClientのIDを保存するよう
    let rastPacketSize:number = 0
    let systemMode:"upload"|"download"|"" = ""

    let changeJsonFlg = true
    let allResetFlg:boolean = false
    let dataClientDoneFirstLogc:boolean = false
    let targetsInfo:targetsInfoInterface = {mainTarget:"",subTarget:""}//mainは自分から接続しに行ったクライアントでsubは相手から接続してきたクライアント
    const resetServerParams = ()=>{
        rastPacketSize = 0
        systemMode = ""
        changeJsonFlg = true
        const myIndex = clientList.findIndex((i)=>i.userId === userId)
        if (myIndex !== -1){
            clientList[myIndex].rastPacketInfo = {rastPacketSize:0,splitDataListLength:0}
            clientList[myIndex].systemMode = ""
        }
    }
    socket.write(setFormat("first_send","server",""))

    socket.on("data",(data:string)=>{
        let getData:any = ""
        if (systemMode === "" && (userId || mainClientId)){
            let myIndex:number = -1
            if (userId){
                myIndex = clientList.findIndex((i)=>i.userId === userId)
            }else{
                myIndex = clientList.findIndex((i)=>i.userId === mainClientId)
            }
            console.log(myIndex)
            systemMode = clientList[myIndex].systemMode as "upload"|"download"|""
        }
        
        console.log(systemMode)
        if (changeJsonFlg){

            getData = JSON.parse(data)
        }else{
            getData = data
            console.log("はははは")
            console.log(targetsInfo)
            dataClientFun(data,targetsInfo,mainClientId,systemMode,resetServerParams)
        }
        if (changeJsonFlg){
            if (getData.type === "send_client_info"){
                clientType = getData.data.data
                if (getData.data.data === "mainClient"){
                    userId = uuid.v4()
                    // systemMode = getData.data.systemMode
                    clientList.push({userId:userId,mainClientSocket:socket,dataClientSocket:undefined,targetInfo:{mainTarget:"",subTarget:""},rastPacketInfo:{rastPacketSize:0,splitDataListLength:0},systemMode:""})
                    socket.write(setFormat("send_server_userId","server",userId))
                }else if (getData.data.data === "dataClient"){
                    console.log("動いてるよ")
                    console.log("sys")
                    console.log(getData.data.userId)
                    const clientIndex = clientList.findIndex((i)=>i.userId === getData.data.userId)
                    // systemMode = getData.data.systemMode
                    if (clientIndex !== -1){
                        mainClientId = getData.data.userId
                        clientList[clientIndex].dataClientSocket = socket
                        targetsInfo = clientList[clientIndex].targetInfo//dataClientにターゲットの情報を設定
                        console.log("hikanjkin")
                        console.log(targetsInfo)
                        // changeJsonFlg = false
                        socket.write(setFormat("testsig","server","done"))
                    }
                }
            }else if (getData.type === "send_main_target"){
                const clientIndex = clientList.findIndex((i)=>i.userId === userId)
                if (clientIndex !== -1){
                    clientList[clientIndex].targetInfo.mainTarget = getData.data.mainTarget
                }
                targetsInfo.mainTarget = getData.data.mainTarget
                //mainTargetに接続リクエストを送信
                const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                if (mainTargetIndex !== -1){
                    console.log(targetsInfo.mainTarget)
                    console.log("リクエストを送信しました")
                    clientList[mainTargetIndex].mainClientSocket.write(setFormat("send_conection_reqest_mainTarget","server",userId))
                }
            }else if (getData.type === "done_connection_mainTarget"){
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === getData.data)
                    targetsInfo.subTarget = getData.data
                    const clientIndex = clientList.findIndex((i)=>i.userId === userId)
                    // if (clientIndex !== -1 && systemMode === "download"){
                    if (clientIndex !== -1){//////
                        clientList[clientIndex].targetInfo.subTarget = getData.data
                    }
                    clientList[subTargetIndex].mainClientSocket.write(setFormat("connection_mainTarget_dataClient","server","start"))
            }else if (getData.type === "start_upload_settings"){
                //データをjsonに変換させないようにする
                const myIndex = clientList.findIndex((i)=>i.userId === userId)
                if (myIndex !== -1){
                    changeJsonFlg = true
                    clientList[myIndex].dataClientSocket.write(setFormat("conection_done_dataClient","server","done"))
                }
            }else if(getData.type === "start_download_settings"){
                const myIndex = clientList.findIndex((i)=>i.userId === userId)
                if (myIndex !== -1){
                    changeJsonFlg = true
                    clientList[myIndex].dataClientSocket.write(setFormat("conection_done_dataClient","server","done"))
                }
            }else if (getData.type === "set_system_mode_1"){
                systemMode = getData.data.systemMode//clientlistのsystemMode変更
                const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                const myIndex = clientList.findIndex((i)=>i.userId === userId)
                console.log(myIndex)
                console.log(getData.data)
                if (systemMode === "upload"){
                    if (mainTargetIndex !== -1 && myIndex !== -1){
                        clientList[mainTargetIndex].systemMode = getData.data.systemMode
                        clientList[myIndex].systemMode = getData.data.systemMode
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("set_system_mode_2","server","upload"))
                    }
                }else if (systemMode === "download"){
                    if (mainTargetIndex !== -1 && myIndex !== -1){
                        clientList[mainTargetIndex].systemMode = getData.data.systemMode
                        clientList[myIndex].systemMode = getData.data.systemMode
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("set_system_mode_2","server","download"))
                    }
                }
            }else if (getData.type === "set_change_json_flg"){
                changeJsonFlg = false
                console.log("ikento")
                socket.write(setFormat("set_done_change_flg","server",getData.data.systemMode))
            }else if (getData.type === "done_rast_logic"){
                if (getData.data === "mainClient"){
                    const myIndex = clientList.findIndex((i)=>i.userId === userId)
                    if (myIndex !== -1){
                        clientList[myIndex].mainClientSocket.write(setFormat("done_rast_logic_1","server",""))
                    }
                    resetServerParams() 
                }else if (getData.data === "dataClient"){
                    if (targetsInfo.mainTarget){
                        const myIndex = clientList.findIndex((i)=>i.userId === mainClientId)
                        if (myIndex !== -1){
                            clientList[myIndex].mainClientSocket.write(setFormat("done_all_logic","server",""))
                        }
                        resetServerParams() 
                    }else if (targetsInfo.subTarget){
                        const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                        if (subTargetIndex !== -1){
                            clientList[subTargetIndex].mainClientSocket.write(setFormat("done_all_logic","server",""))
                        }
                        resetServerParams() 
                    }
                }
            }
            else if (getData.type === "set_change_flg_sec"){
                ///dataClient用
                if (getData.data === "upload"){
                    changeJsonFlg = false
                    const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                    if (mainTargetIndex !== -1){
                        // clientList[myIndex].mainClientSocket.write(setFormat("all_set_changeFlg","server","done"))
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("set_data_change_flg_sec_client","server","set"))
                    }
                    console.log("setDone")
                }else if (getData.data === "download"){
                    const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                    if (mainTargetIndex !== -1){
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("set_change_flg_sec_client","server","set"))
                    }
                }
            }else if (getData.type === "set_change_flg_sec_server"){
                // if (systemMode === "download"){//難あり
                if (getData.data !== "data_change"){
                    changeJsonFlg = false           
                }         
                // }
                const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                if (subTargetIndex !== -1){
                    console.log("送信は下田")
                    clientList[subTargetIndex].mainClientSocket.write(setFormat("all_set_changeFlg","server","done"))
                }
                console.log("setDone2")
            }
            else if (systemMode === "upload"){
                if (getData.type === "done_write_mainTargetFile"){
                    console.log("jkfldsjaklfjdasoiejfoiw")
                    console.log(targetsInfo)
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                    if (subTargetIndex !== -1){
                        clientList[subTargetIndex].mainClientSocket.write(setFormat("send_next_reqest","server","done"))
                    }
                }else if (getData.type === "send_rast_packet_size"){
                    rastPacketSize = getData.data.rastPacketSize
                    const myIndex = clientList.findIndex((i)=>i.userId === userId)
                    console.log("パケットサイズ取得３")
                    if (myIndex !== -1){
                        console.log("パケットサイズ取得")
                        console.log(userId)
                        console.log(rastPacketSize)
                        clientList[myIndex].rastPacketInfo.rastPacketSize = rastPacketSize
                        clientList[myIndex].rastPacketInfo.splitDataListLength = getData.data.splitDataListLength
                    }
                    console.log(rastPacketSize)
                    const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                    if (mainTargetIndex !== -1){
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("send_rast_packet_size_mainTarget","server",{rastPacketSize:rastPacketSize,splitDataListLength:getData.data.splitDataListLength}))
                    }
                }else if (getData.type === "start_send_packet"){
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                    if (subTargetIndex !== -1){
                        clientList[subTargetIndex].mainClientSocket.write(setFormat("start_send_packet_2","server","done"))
                    }
                }else if (getData.type === "done_set_all_systemMode"){
                    console.log("here moveing2")
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                    if (subTargetIndex !== -1){
                        clientList[subTargetIndex].mainClientSocket.write(setFormat("done_set_all_systemMode_2","server",getData.data))
                    }
                }
            }else if (systemMode === "download"){
                if (getData.type === "send_download_path_main"){
                    const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                    if (mainTargetIndex !== -1){
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("send_download_path_sub","server",getData.data))
                    }
                }else if (getData.type === "send_rast_packet_size"){
                    rastPacketSize = getData.data.rastPacketSize
                    const myIndex = clientList.findIndex((i)=>i.userId === userId)
                    if (myIndex !== -1){
                        clientList[myIndex].rastPacketInfo.rastPacketSize = rastPacketSize
                        clientList[myIndex].rastPacketInfo.splitDataListLength = getData.data.splitDataListLength
                    }
                    console.log(rastPacketSize)
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                    if (subTargetIndex !== -1){
                        clientList[subTargetIndex].mainClientSocket.write(setFormat("send_rast_packet_size_subTarget","server",{rastPacketSize:rastPacketSize,splitDataListLength:getData.data.splitDataListLength}))
                    }
                }else if (getData.type === "start_send_packet"){
                    console.log("パケットを送信する前の人です")
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                    console.log(subTargetIndex)
                    console.log(targetsInfo)
                    if (subTargetIndex !== -1){
                        clientList[subTargetIndex].mainClientSocket.write(setFormat("start_send_packet_2","server",""))
                    }
                }else if (getData.type === "done_write_mainTargetFile"){
                    const mainTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.mainTarget)
                    if (mainTargetIndex !== -1){
                        clientList[mainTargetIndex].mainClientSocket.write(setFormat("send_next_reqest","server","done"))
                    }
                }else if (getData.type === "done_set_all_systemMode"){
                    console.log("here moveing")
                    const subTargetIndex = clientList.findIndex((i)=>i.userId === targetsInfo.subTarget)
                    if (subTargetIndex !== -1){
                        clientList[subTargetIndex].mainClientSocket.write(setFormat("done_set_all_systemMode_2","server",getData.data))
                    }
                }
            }
        }
    })
})

server.listen(PORT,()=>{
    console.log("server run!")
})
