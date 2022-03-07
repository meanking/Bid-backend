import fs from 'fs';
import Web3 from 'web3';
import moment from 'moment';
import { delegateAddress, delegatePrivKey, infuraKey } from '../settings';
import { ABI, ADDRESS } from '../constants/abi';

export const web3Service = () => {
    const getUserBidInfo = async (address) => {
        try {
            const web3 = new Web3(new Web3.providers.HttpProvider(`https://rinkeby.infura.io/v3/${infuraKey}`));
            const contract = new web3.eth.Contract(ABI, ADDRESS);

            const bidAmount = await contract.methods.bidsMap(address).call();
            const totalBids = await contract.methods.totalNrOfBidders().call();
            const expirationTimeString = await contract.methods.expirationTime().call();
            const expirationTime = moment(parseInt(expirationTimeString)).toLocaleString();
            return {
                bidAmount,
                totalBids,
                expirationTime
            };
        } catch (e) {
            console.log('error on fetching bid info - ', e);
            throw e;
        }
    }

    const delegateBid = async (address, value, r, s, v) => {
        try {
            const web3 = new Web3(new Web3.providers.HttpProvider(`https://rinkeby.infura.io/v3/${infuraKey}`));
            web3.eth.accounts.wallet.add({
                privateKey: delegatePrivKey,
                address: delegateAddress
            });
            const contract = new web3.eth.Contract(ABI, ADDRESS);

            const estimatedGas = await contract.methods.tryBid(
                address,
                value,
                r,
                s,
                v
            ).estimateGas({
                from: process.env.WALLET_ADDRESS
            });
            console.log('this.estmiated gas', estimatedGas);
            const transaction = await contract.methods.tryBid(address, value, r, s, v).send({
                from: delegateAddress,
                gasPrice: this.web3Service.utils.toHex(5000000000),
                gasLimit: estimatedGas
            });
            return transaction.transactionHash;
        } catch (e) {
            console.log('error on delegate bid - ', e);
            throw e;
        }
    }

    const syncBidEvents = async () => {
        const options = {
            // Enable auto reconnection
            reconnect: {
                auto: true,
                delay: 15000, // ms
                maxAttempts: 5,
                onTimeout: false
            },
            clientConfig: {
                maxReceivedFrameSize: 2000000, // bytes - default: 1MiB, current: 2MiB
                maxReceivedMessageSize: 10000000, // bytes - default: 8MiB, current: 10Mib
            }
        };
        const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://rinkeby.infura.io/ws/v3/${infuraKey}`, options));
        const contract = new web3.eth.Contract(ABI, ADDRESS);

        console.log('event sync started');
        let option = {
            filter: {},
            fromBlock: 0,                  //Number || "earliest" || "pending" || "latest"
            toBlock: 'latest'
        };
        contract.getPastEvents('Bid', option)
            .then(async results => {
                const bidEvents = [];
                results.forEach(result => {
                    bidEvents.push({
                        user: result['returnValues']['user'],
                        amount: result['returnValues']['amount']
                    })
                });
                if (bidEvents.length > 0) {
                    await fs.appendFileSync('../bids.json', JSON.stringify(bidEvents, null, 2));
                }
            });
        // All events handler
        contract.events
            .allEvents()
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            .on('data', async event => {
                console.log('detected event - ', event);
                const transactionReceiptPromise = web3.eth.getTransactionReceipt(
                    event.transactionHash
                );

                // const blockDataPromise = web3.eth.getBlock(event.blockNumber);

                const [transactionReceipt] =
                await Promise.all([
                    // transactionPromise,
                    transactionReceiptPromise,
                    // blockDataPromise
                ]);

                const logs = transactionReceipt.logs;
                const bidEvents = logs.map(log => {
                    if (log.topics[0] === '0xe684a55f31b79eca403df938249029212a5925ec6be8012e099b45bc1019e5d2') {
                        return {
                            user: log.topics[1],
                            amount: log.topics[2]
                        }
                    }
                });

                if (bidEvents.length > 0) {
                    await fs.appendFileSync('../bids.json', JSON.stringify(bidEvents, null, 2));
                }
            });
    }

    return { getUserBidInfo, delegateBid, syncBidEvents };
};
