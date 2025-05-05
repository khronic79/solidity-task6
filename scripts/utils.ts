import Web3 from 'web3';

export function weiToStringEtherWeb3(wei: string | BigInt): string {
  try {
    const web3 = new Web3();
    return web3.utils.fromWei(wei.toString(), 'wei');
  } catch (error) {
    console.error("Ошибка конвертации текста в WEI", error);
    throw error;
  }
}