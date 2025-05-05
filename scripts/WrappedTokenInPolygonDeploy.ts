import Web3 from 'web3';
import dotenv from 'dotenv';
import * as contractData from '../artifacts/contracts/WrappedTokenInPolygon.sol/WrappedTokenInPolygon.json';
import { appendFileSync } from 'fs';

dotenv.config();

async function deployContract() {

    const web3 = new Web3(process.env.AMOY_POLYGON_RPC_ADDRESS);
    
    const account = web3.eth.accounts.privateKeyToAccount(`0x${process.env.CONTRACT_OWNER_PRIVATE_KEY}`);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Деплой производится с адреса:', account.address);
    
    const abi = contractData.abi;
    const bytecode = contractData.bytecode;
    const gasPrice = String(await web3.eth.getGasPrice());
    const contract = new web3.eth.Contract(abi);
    const deploy = contract.deploy({ 
      data: bytecode,
      arguments: [process.env.BRIDGE_ADDRESS]
     });
    const gas = String(await deploy.estimateGas({ from: account.address }));

    deploy.send({
        from: account.address,
        gas,
        gasPrice
    })
      .on('receipt', (receipt) => {
        const currentDate = new Date();
        const dataToWrite = `Контракт развернут по адресу: ${receipt.contractAddress}, Tx Hash: ${receipt.transactionHash}, Date: ${currentDate.toISOString()} \n`;
        appendFileSync('deployment-wrapped-token-info.txt', dataToWrite);
        console.log('Контракт ', receipt.contractAddress);
        console.log('Transaction hash:', receipt.transactionHash);
      });
}

deployContract();