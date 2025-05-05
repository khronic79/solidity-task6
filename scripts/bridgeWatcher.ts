import Web3 from "web3";
import dotenv from "dotenv";
import * as baseToken from "../artifacts/contracts/BaseTokenInBNB.sol/BaseTokenInBNB.json";
import * as wrappedToken from "../artifacts/contracts/WrappedTokenInPolygon.sol/WrappedTokenInPolygon.json";

interface TransferEventValues {
  from: string;
  to: string;
  value: string;
}

dotenv.config();

// Получаем приватный ключ моста, чтобы иметь возможность жечь и минтить токены в Polygon,
// а также возвращать токены на адрес владельца в сети BNB
const BRIDGE_PRIVATE_KEY = `0x${process.env.BRIDGE_PRIVATE_KEY}`;

// Получаем адреса контрактов в сети BNB и Polygon
const BASE_TOCKEN_ADDRESS = process.env.BASE_TOKEN_CONTRACT_ADDRESS;
const WRAPPED_TOKEN_ADDRESS = process.env.WRAPPED_TOKEN_CONTRACT_ADDRESS;

// Получаем адреса RPC-узлов сети BNB и Polygon
// Обратите внимание, что для событий используются WSS RPC-узлы
const BNB_RPC_URL = process.env.TEST_BNB_RPC_ADDRESS;
const POLYGON_RPC_URL = process.env.AMOY_POLYGON_RPC_ADDRESS;
const WSS_BNB_RPC_URL = process.env.WSS_TEST_BNB_RPC_ADDRESS;
const WSS_POLYGON_RPC_URL = process.env.WSS_AMOY_POLYGON_RPC_ADDRESS;

// Создаем объекты подключений к сети BNB и Polygon через RPC-узлы через hhtps
const bnbWeb3 = new Web3(BNB_RPC_URL);
const polygonWeb3 = new Web3(POLYGON_RPC_URL);

// Создаем объекты подключений к сети BNB и Polygon через RPC-узлы через wss
const wssBnbWeb3 = new Web3(WSS_BNB_RPC_URL);
const wssPolygonWeb3 = new Web3(WSS_POLYGON_RPC_URL);

// Создаем объекты аккаунтов моста в сети BNB и Polygon
const bridgeBnbAccount = bnbWeb3.eth.accounts.privateKeyToAccount(BRIDGE_PRIVATE_KEY);
const bridgePolygonAccount = polygonWeb3.eth.accounts.privateKeyToAccount(BRIDGE_PRIVATE_KEY);

bnbWeb3.eth.accounts.wallet.add(bridgeBnbAccount);
polygonWeb3.eth.accounts.wallet.add(bridgePolygonAccount);

// Создаем объекты контрактов в сети BNB и Polygon
const baseTokenContract = new bnbWeb3.eth.Contract(
    baseToken.abi,
    BASE_TOCKEN_ADDRESS
);

const wssBaseTokenContract = new wssBnbWeb3.eth.Contract(
  baseToken.abi,
  BASE_TOCKEN_ADDRESS
);

const wrappedTokenContract = new polygonWeb3.eth.Contract(
    wrappedToken.abi,
    WRAPPED_TOKEN_ADDRESS
);

const wssWrappedTokenContract = new wssPolygonWeb3.eth.Contract(
  wrappedToken.abi,
  WRAPPED_TOKEN_ADDRESS
);

// Создаем подписку на события Transfer контракта базового токена в сети BNB
const baseTokenContractSubscription = wssBaseTokenContract.events.Transfer({
  fromBlock: 'latest'
});

// Подписываемся на событие получения данных по событию Transfer в сети BNB
baseTokenContractSubscription.on('data', async (event) => {
  const { transactionHash } = event;
  const { from, to, value } = event.returnValues as unknown as TransferEventValues;
  
  // Если транзакция с адреса моста, игнорируем ее
  if (from === bridgeBnbAccount.address) return;
  // Если транзакция идет на адрес моста, начинаем обработку транзакции
  if (to === bridgeBnbAccount.address && to !== from) {
      console.log('----------- Начался перевод базового токена из BNB в Polygon ----------');
      console.log('Токены переданы на адрес моста. Начинаю обработку транзакции...');

      try {
          // Запускаем функцию минтинга токенов в сети Polygon
          await bridgeTokens(from, value);
          console.log('Токены переданы в сеть Polygon');
      } catch (err) {
          console.error('Ошибка передачи токенов BNB -> POLYGON! Требуется ручное управление!');
          console.error('Хэш транзакции в BNB: ', transactionHash);
          console.error('Ошибка: ', err);
      }
  }
});

baseTokenContractSubscription.on('error', (err) => {
  console.log('Ошибка призошла в контракте базовом', err);
});
console.log('Ожидаем событий на базовом контракте в BPB');

// Создаем подписку на события Transfer контракта базового токена в сети Polygon
const wrappedTokenContractSubscription = wssWrappedTokenContract.events.Transfer({
  fromBlock: 'latest'
})

// Подписываемся на событие получения данных по событию Transfer в сети Polygon
wrappedTokenContractSubscription.on('data', async (event) => {
  const { from, to, value } = event.returnValues as unknown as TransferEventValues;
  
  // Если транзакция с адреса моста, игнорируем ее
  if (from === bridgePolygonAccount.address) return;
  // Если транзакция идет на адрес моста, начинаем обработку транзакции
  if (to === bridgePolygonAccount.address && to !== from) {
      console.log('----------- Начался возврат обертки из Polygon в BNB ----------');
      console.log('Токены переданы на адрес моста. Начинаю обработку транзакции...');

      try {
          // Запускаем функцию возврата токенов в сети BNB и сжигание в сети Polygon
          await bridgeTokensBack(from, value);
          console.log('Токены переданы в сеть BNB');
      } catch (err) {
          console.error('Ошибка передачи токенов POLYGON -> BNB', err);
      }
  }
});

wrappedTokenContractSubscription.on('error', (err) => {
  console.log('Ошибка призошла в контракте обертке', err);
});
console.log('Ожидаем событий на контракте обертке в Polygon');

// Функция начисления токенов в сети Polygon
async function bridgeTokens(recipient: string, amount: string) {
  console.log('Адрес получателя: ', recipient);
  console.log('Сумма токенов для обработки: ', amount);
  try {
    // Оценивем газ за транзацию минтинга
    const gas = String((await wrappedTokenContract.methods
      .mintByBridge(recipient, BigInt(amount))
      .estimateGas({ from: bridgePolygonAccount.address })) + 50000n);
    console.log('Газ: ', gas);
    // Получем цену газа
    const gasPrice = String(await polygonWeb3.eth.getGasPrice());
    console.log('Газ прайс: ', gasPrice);
    // Минтим токены обертки в сети Polygon
    const receipt = await wrappedTokenContract.methods
      .mintByBridge(recipient, BigInt(amount))
      .send({
        from: bridgePolygonAccount.address,
        gas,
        gasPrice
      });
    console.log('Транзакция начисление обернутого токена в Polygon успешна:', receipt.transactionHash);
  } catch (error) {
      console.error('Не удалось начислить обернутый токен на адрес получателя в сети Polygon');
      console.error('Ошибка при работе бриджа! Требуется ручное управление! ', error);
      throw error;
  }
  const wrappedTokenBalance = (await wrappedTokenContract.methods
    .balanceOf(recipient)
    .call()) as string;
  console.log(`Баланс получателя в Polygon: ${polygonWeb3.utils.fromWei(wrappedTokenBalance.toString(), 'ether')} Tokens`);   
}

// Функция возврата токенов в сети BNB и сжигание в сети Polygon
async function bridgeTokensBack(recipient: string, amount: string) {
  console.log('Адрес получателя: ', recipient);
  console.log('Сумма токенов для обработки: ', amount);
  try {
    // Оценивем газ за транзацию сжигания токенов с адреса моста в Polygon
    const gas = String((await wrappedTokenContract.methods
      .burnByBridge(bridgePolygonAccount.address, BigInt(amount))
      .estimateGas({ from: bridgePolygonAccount.address })) + 50000n);
    // Получем цену газа
    const gasPrice = String(await polygonWeb3.eth.getGasPrice());
    // Сжигаем токены с адреса моста в сети Polygon
    const receipt = await wrappedTokenContract.methods
      .burnByBridge(bridgePolygonAccount.address, BigInt(amount))
      .send({
        from: bridgePolygonAccount.address,
        gas,
        gasPrice
      });
    console.log('Транзакция сжигание обернутого токена в Polygon успешна:', receipt.transactionHash);
  } catch (error) {
    console.error('Не удалось сжечь точкена на контракте обертки в Polygon');
    console.error('Ошибка при работе бриджа! Требуется ручное управление! ', error);
    throw error;
  }

  const wrappedTokenBalance = (await wrappedTokenContract.methods
    .balanceOf(recipient)
    .call()) as string;
  console.log(`Баланс получателя в Polygon: ${polygonWeb3.utils.fromWei(wrappedTokenBalance, 'ether')} Tokens`);

  try {
    // Оценивем газ за транзацию возврата токенов в сети BNB
    const gas = String((await baseTokenContract.methods
      .transfer(recipient, BigInt(amount))
      .estimateGas({ from: bridgeBnbAccount.address })) + 50000n);
    // Получем цену газа
    const gasPrice = String(await bnbWeb3.eth.getGasPrice());
    // Возвращаем токены в сети BNB
    const receipt = await baseTokenContract.methods
      .transfer(recipient, BigInt(amount))
      .send({
        from: bridgeBnbAccount.address,
        gas,
        gasPrice
      });
    console.log('Транзакция возврата базового токена в BNB успешна:', receipt.transactionHash);
  } catch (error) {
      console.error('Не удалось передать базовый токен на адрес получателя в сети BNB');
      console.error('Ошибка при работе бриджа! Требуется ручное управление! ', error);
      throw error;
  }

  const baseTokenBalance = (await baseTokenContract.methods
    .balanceOf(recipient)
    .call()) as string;
  console.log(`Баланс получателя в BNB: ${bnbWeb3.utils.fromWei(baseTokenBalance, 'ether')} Tokens`);
}