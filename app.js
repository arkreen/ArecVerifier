import { Contract, InfuraProvider} from "ethers";
import axios from 'axios';
import {Web3Storage} from "web3.storage";
import logger from './log4js.js';

let arg = process.argv.slice(2);
let tokenId = arg[0];
let apiToken = 'paste-your-token-here';
const client = new Web3Storage({ token:  apiToken});
const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve,time))
}

const separator1 = "=".repeat(120);
const separator2 = "-".repeat(60);

const tab = '\t'
const tabLength1 = 81;
const tabLength2 = 9;
const paddedTab1 = tab.padEnd(tabLength1, ' ');
const paddedTab2 = tab.padEnd(tabLength2, ' ');


async function main() {
    try{
        if(tokenId == undefined)
        {
            console.log('USAGE\n  node app.js <tokenid>\n')
            console.log('ARGUMENTS\n  <tokenid> - AREC token ID number to verify')
            return
        }

        logger.info('Start to process...')
        logger.info(separator1 + '\n');
        logger.info('Getting the info from the contract by the token ID which is ' + tokenId + ' ...')

        // Get the cid and other info from the contract by the token ID
        let rec_issuance_contract_address = '0x954585adF9425F66a0a2FD8e10682EB7c4F1f1fD'
        let provider_app_key = '0ab4ce267db54906802cb43b24e5b0f7'
        let chain_type = 'matic'
        let provider = new InfuraProvider(chain_type, provider_app_key)

        let abi =  [
            {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
              }
            ],
            "name": "getRECData",
            "outputs": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "issuer",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "serialNumber",
                    "type": "string"
                  },
                  {
                    "internalType": "address",
                    "name": "minter",
                    "type": "address"
                  },
                  {
                    "internalType": "uint32",
                    "name": "startTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint32",
                    "name": "endTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint128",
                    "name": "amountREC",
                    "type": "uint128"
                  },
                  {
                    "internalType": "uint8",
                    "name": "status",
                    "type": "uint8"
                  },
                  {
                    "internalType": "string",
                    "name": "cID",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "region",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "url",
                    "type": "string"
                  },
                  {
                    "internalType": "string",
                    "name": "memo",
                    "type": "string"
                  },
                  {
                    "internalType": "uint16",
                    "name": "idAsset",
                    "type": "uint16"
                  }
                ],
                "internalType": "struct RECData",
                "name": "",
                "type": "tuple"
              }
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ]

        let contract = new Contract(rec_issuance_contract_address, abi, provider);
        let nft_obj_array = await contract.getRECData(tokenId)
        let nft_obj = {
                serialNumber: nft_obj_array[1],
                amountREC:nft_obj_array[5],
                cID:nft_obj_array[7],
                idAsset:nft_obj_array[11]
        }

        if(nft_obj.cID === '')
        {
            throw 'CID is empty in this token ID!'
        }

        if(nft_obj.idAsset == 1)
        {
            throw 'This tool does not support to verify this token ID currently!'
        }

        let energy = BigInt(0)

        // Get the files according to the cid in the token
        const info = await client.get(nft_obj.cID)

        if (info.ok)
        {
            const files = await info.files();
            logger.info(separator1+ '\n');
            logger.info('There are in total ' + files.length + ' miners!')
            logger.info(separator1+ '\n');

            let count = 1

            // Process each file
            for (let file of files)
            {
                logger.info('Starting to process miner ' + count)
                logger.info(separator2);

                // Get the file name, which is miner address
                const minerAddress = file.name

                logger.info('The info of miner ' + minerAddress + ' :')
                logger.info('URL'+paddedTab1+'Date'+paddedTab2+'Energy(Wh)')

                // Get the file cid
                const minerCid =  file.cid

                let fileInfo = null
                while(!fileInfo){
                    try{
                        // Get the file content according to the file cid
                        fileInfo = await client.get(minerCid)
                    }catch(error)
                    {
                        logger.info('Got error when get the file content from the cid'+ ' ' + err)
                        // Delay 10 seconds
                        logger.info('Will try again after 10 seconds...')
                        await sleep(10000);
                    }
                }

                if(fileInfo.ok)
                {
                    const fileInfoFiles = await fileInfo.files()
                    const fileContent = await fileInfoFiles[0].arrayBuffer()
                    const fileContentStr = Buffer.from(fileContent).toString()
                    // Construct the array
                    let array = fileContentStr.split("\r\n")
                    // Remove the empty element in the array
                    const newArray = array.filter(function(str) {
                        return str
                    })
                    let infoArray = newArray.map(
                        s =>
                        {
                            let json = {
                                "day": s.substring(0,10),
                                "cid": s.substring(11)
                            }
                           return json
                        }
                    )

                    // Get the start date of the miner's life cycle
                    const response = await axios.post("https://api.arkreen.com/v1", {
                        jsonrpc: '2.0',
                        method:"rec_getStartDateByMiner",
                        params:{
                            "miner": minerAddress
                        },
                        id: 2,
                    });

                    if(!response.data.error)
                    {
                        const startDate = response.data.result
                        // Get the date of first day for the miner in this AREC
                        const dayFirst = infoArray[0].day

                        // Get the date of the day before the first day
                        let updateDate = new Date(dayFirst);
                        updateDate.setDate(updateDate.getDate() - 1)
                        let dateBefore = updateDate.getUTCFullYear() + "-" + (updateDate.getUTCMonth() < 9 ? '0' + (updateDate.getUTCMonth()+1) : (updateDate.getUTCMonth()+1)) + "-" + (updateDate.getUTCDate() < 10 ? '0' + updateDate.getUTCDate() : updateDate.getUTCDate())

                        // Compare the start date of the miner's life cycle and the date of first day for the miner in this AREC
                        if(startDate === dayFirst)
                        {
                            // The two date are same
                            let ele = {
                                "day": dateBefore,
                                "cid": '',
                                "maxEnergy": BigInt(0)
                            }
                            infoArray.unshift(ele)
                        }
                        else
                        {
                            // The two date are different
                            let flag = false
                            do{
                                // Get the day cid of rec before the date of first day for the miner in this AREC
                                let cidInfo = await axios.post("https://api.arkreen.com/v1", {
                                    jsonrpc: '2.0',
                                    method:"rec_getDayCid",
                                    params:{
                                        "date": dateBefore.replace(/-/g,'')
                                    },
                                    id: 2,
                                });

                                if(!cidInfo.data.error)
                                {
                                    let cid = cidInfo.data.result.recCid
                                    if(cid != null)
                                    {
                                        let fileRes = null
                                        while(!fileRes){
                                            try{
                                                // Get the files of the cid
                                                fileRes = await client.get(cid)
                                            }catch(error)
                                            {
                                                logger.info('Got error when get the file content from the cid'+ ' ' + err)
                                                // Delay 10 seconds
                                                logger.info('Will try again after 10 seconds...')
                                                await sleep(10000);
                                            }
                                        }

                                        if(fileRes.ok)
                                        {
                                            const fileResFiles = await fileRes.files()

                                            for(let eachFile of fileResFiles)
                                            {
                                                // Found the miner
                                                if(eachFile.name == minerAddress)
                                                {
                                                    let ele = {
                                                        "day": dateBefore,
                                                        "cid": cid
                                                    }
                                                    infoArray.unshift(ele)
                                                    flag = true
                                                    break
                                                }
                                            }
                                        }
                                        else
                                        {
                                            throw new Error(`failed to get ${cid} - [${fileRes.status}] ${fileRes.statusText}`)
                                        }
                                    }
                                }
                                else
                                {
                                    throw new Error(`failed to get the day cid of the date ${dateBefore}`)
                                }

                                // Not yet found the miner file in the day cid of rec before the date of first day
                                if(flag == false)
                                {
                                    // Continue to get the day before
                                    let update = new Date(dateBefore);
                                    update.setDate(update.getDate() - 1)
                                    dateBefore = update.getUTCFullYear() + "-" + (update.getUTCMonth() < 9 ? '0' + (update.getUTCMonth()+1) : (update.getUTCMonth()+1)) + "-" + (update.getUTCDate() < 10 ? '0' + update.getUTCDate() : update.getUTCDate())
                                }
                            }while(flag == false)
                        }

                        for (let i = 0; i < infoArray.length; i++)
                        {
                            let finalCid = ''

                            if(infoArray[i].cid != '')
                            {
                                let infoArrRes = null
                                while(!infoArrRes){
                                    try{
                                        // Get the files of the cid
                                        infoArrRes = await client.get(infoArray[i].cid)
                                    }catch(error)
                                    {
                                        logger.info('Got error when get the file content from the cid'+ ' ' + err)
                                        // Delay 10 seconds
                                        logger.info('Will try again after 10 seconds...')
                                        await sleep(10000);
                                    }
                                }

                                if(infoArrRes.ok)
                                {
                                    const infoArrFiles = await infoArrRes.files()

                                    for(let e of infoArrFiles)
                                    {
                                        if(e.name == minerAddress)
                                        {
                                            finalCid = e.cid
                                            break
                                        }
                                    }
                                }
                                else
                                {
                                    throw new Error(`failed to get ${infoArray[i].cid} - [${infoArrRes.status}] ${infoArrRes.statusText}`)
                                }
                            }

                            if(finalCid === '')
                            {
                                if(i != 0)
                                {
                                    // No any record for this miner in the current cid
                                    // So the value of the current day's max energy is equal to the value of the previous day
                                    infoArray[i].maxEnergy = infoArray[i-1].maxEnergy
                                }
                            }
                            else
                            {
                                let finalCidRes = null
                                while(!finalCidRes){
                                    try{
                                        // Get the files of the cid
                                        finalCidRes = await client.get(finalCid)
                                    }catch(error)
                                    {
                                        logger.info('Got error when get the file content from the cid'+ ' ' + err)
                                        // Delay 10 seconds
                                        logger.info('Will try again after 10 seconds...')
                                        await sleep(10000);
                                    }
                                }

                                if(finalCidRes.ok)
                                {
                                    const res = await finalCidRes.files()
                                    const resBuffer = await res[0].arrayBuffer()
                                    const finalContent = Buffer.from(resBuffer).toString()

                                    // Start to calculate the energy
                                    // Construct the array from the file content
                                    const contentArray = finalContent.split(',\r\n')
                                    const newContentArray = contentArray.filter(function(str) {
                                        return str
                                    })

                                    let dataArray = newContentArray.map( s =>
                                        {
                                            let jsonFile = JSON.parse(s)
                                            return jsonFile.dataList
                                        }
                                    )
                                    // Sort the array to make sure the elements are sorted by time
                                    dataArray.sort()

                                    // Get the max energy value of the current day
                                    const length1 = dataArray.length
                                    const length2 = dataArray[length1-1].length
                                    const maxEnergy = BigInt('0x' + dataArray[length1-1][length2-1].substring(24))
                                    infoArray[i].maxEnergy = maxEnergy

                                    if(i != 0)
                                    {
                                        let dayEnergy = BigInt(0)
                                        for(let k = 0; k < dataArray.length; k++)
                                        {
                                            for(let j = 0; j < dataArray[k].length; j++)
                                            {
                                                if(j == 0)
                                                {
                                                    if(k == 0)
                                                    {
                                                        const increase1 = BigInt('0x' + dataArray[k][j].substring(24)) - infoArray[i-1].maxEnergy
                                                        dayEnergy += increase1
                                                    }
                                                    else
                                                    {
                                                        const len = dataArray[k-1].length
                                                        const increase2 = BigInt('0x' + dataArray[k][j].substring(24)) - BigInt('0x' + dataArray[k-1][len-1].substring(24))
                                                        dayEnergy += increase2
                                                    }
                                                }
                                                else
                                                {
                                                    const increase3 = BigInt('0x' + dataArray[k][j].substring(24)) - BigInt('0x' + dataArray[k][j-1].substring(24))
                                                    dayEnergy += increase3
                                                }
                                            }
                                        }

                                        let dayE = dayEnergy/BigInt(1000)
                                        let url = "https://" + finalCid + ".ipfs.w3s.link"
                                        logger.info(''+url+'\t'+infoArray[i].day+'\t'+dayE)
                                        energy += dayEnergy
                                    }
                                }
                                else
                                {
                                    throw new Error(`failed to get ${finalCid} - [${finalCidRes.status}] ${finalCidRes.statusText}`)
                                }
                            }
                        }
                    }
                    else
                    {
                        throw new Error(`failed to get the start date of the miner ${minerAddress}`)
                    }
                }
                else
                {
                    throw new Error(`failed to get ${minerCid} - [${fileInfo.status}] ${fileInfo.statusText}`)
                }

                count += 1
                logger.info(separator1+ '\n')
            }
        }
        else
        {
            throw new Error(`failed to get ${nft_obj.cID} - [${info.status}] ${info.statusText}`)
        }

        logger.info('Total energy calculated is '+ energy/BigInt(1000) + ' Wh')
        logger.info('The amount of energy in the AREC token is ' + BigInt(nft_obj.amountREC)/BigInt(1000) + ' Wh')

        // Compare the energy calculated and the one in the AREC token
        if(BigInt(nft_obj.amountREC) == energy)
        {
            logger.info('Done! Verification succeeded!')
        }
        else
        {
            logger.info('Done! Verification failed!')
        }

        logger.info(separator1+ '\n')
    }catch(err){
        logger.info('Got error during the verification process!' + ' ' + err)
    }

}


main().then().catch(error => {
    console.error(error);
    process.exit(1);
});
