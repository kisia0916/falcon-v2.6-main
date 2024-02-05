import * as readline from "readline"
export const getInput = (beforeText:string)=>{
    const readLine = readline.createInterface({
        input:process.stdin,
        output:process.stdout
    })
    return new Promise((resolve, reject) => {
        readLine.question(beforeText, (answer) => {
          resolve(answer.toString());
          readLine.close();
        });
    })
}

export const cmdAnalyze = (cmd:string)=>{
    
}