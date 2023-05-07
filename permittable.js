// https://api.1inch.io/v5.0/56/swap?
// amount=1000000000000000000&
// fromAddress=0x29010F8F91B980858EB298A0843264cfF21Fd9c9&
// fromTokenAddress=0x111111111117dc0aa78b770fa6a738034120c302&
// permit=
// 000000000000000000000000xxxxxxxxxxx980858eb298a0843264cff21fd9c9 // owner
// 0000000000000000000000001111111254eeb25477b68fb85ed929f73a960582 // spender
// 0000000000000000000000000000000000c097ce7bc90715b34b9f1000000000 // value
// 0000000000000000000000000000000000000000000000000000000063ada9c0 // deadline
// 000000000000000000000000000000000000000000000000000000000000001b // v
// 04dd10d79a8b12a5a93606f6872bb5b25ba3e41609be79409032f9dc6738792b // r
// 08e0318c0dcd4ec8e3309ac0ff46d52d25e43369611402bc1ddd01fe0602ee56 // s
// &slippage=1&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&disableEstimate=true



//

const ethers = require('ethers');
const { BigNumber } = require('ethers');

const fetch = require('node-fetch'); // make sure it's 2.6 and not 3 or this example doesn't work


const wallet_key = "..." //Your wallet private key
const wallet_address = "0xxxxxxxxxxxx980858eb298a0843264cff21fd9c9" // Your wallet address
const inchTokenAddress = "0x111111111117dc0aa78b770fa6a738034120c302" // 1inch token address
const chainID = 56 // BSC chain ID
const spender = "0x1111111254eeb25477b68fb85ed929f73a960582"; // 1inch contract address
const web3 = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/") // BSC RPC provider
const wallet = new ethers.Wallet(wallet_key, web3) // Create wallet instance so we can sign permits

// a permit contains the following parameters:
// owner: address of the wallet that is granting the permit
// spender: address of the contract that is allowed to spend the owner's tokens
// value: amount of tokens that the spender is allowed to spend
// deadline: timestamp after which the permit is no longer valid
// v, r, s: signature of the permit

const ERC20ABI = [
    "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
    "function nonces(address owner) external view returns (uint256)",
    "function DOMAIN_SEPARATOR() external view returns (bytes32)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
]

const erc20Contract = new ethers.Contract(inchTokenAddress, ERC20ABI, wallet) // Create contract instance so we can get the nonces of the wallet address

const permit = async () => {
    const nonce = await erc20Contract.nonces(wallet_address) // Get the nonce of the wallet address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // Set the deadline to 20 minutes from now
    const amount = BigNumber.from("1000000000000000000") // Set the amount to 1 inch token

    // Create the permit
    const permitData = {
        owner: wallet_address,
        spender: spender, // 1inch contract address
        value: amount,
        nonce: nonce,
        deadline: deadline
    }

    // Sign the permit
    const signature = await wallet._signTypedData(
        {
            name: await erc20Contract.name(),
            version: "1",
            chainId: chainID,
            verifyingContract: inchTokenAddress,
        },
        {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        },
        permitData
    )

    // Split the signature into v, r, s
    const vrs = ethers.utils.splitSignature(signature)

    // make the permit data 1 long string with the v, r, s values at the end like so: 0x00000000000000000000000029010f8f91b980858eb298a0843264cff21fd9c90000000000000000000000001111111254eeb25477b68fb85ed929f73a9605820000000000000000000000000000000000c097ce7bc90715b34b9f10000000000000000000000000000000000000000000000000000000000000000063ada9c0000000000000000000000000000000000000000000000000000000000000001b04dd10d79a8b12a5a93606f6872bb5b25ba3e41609be79409032f9dc6738792b08e0318c0dcd4ec8e3309ac0ff46d52d25e43369611402bc1ddd01fe0602ee56
    let permitString = ""
    
    permitString += ethers.utils.hexZeroPad(permitData.owner, 32).replace("0x", "")
    permitString += ethers.utils.hexZeroPad(permitData.spender, 32).replace("0x", "")
    permitString += ethers.utils.hexZeroPad(permitData.value._hex.toString(), 32).replace("0x", "")
    permitString += ethers.utils.hexZeroPad(BigNumber.from(permitData.deadline)._hex.toString(), 32).replace("0x", "")

    permitString += ethers.utils.hexZeroPad(BigNumber.from(vrs.v)._hex.toString(), 32).replace("0x", "")
    permitString += vrs.r.toString().replace("0x", "") // r and s are already 32 bytes long
    permitString += vrs.s.toString().replace("0x", "") // r and s are already 32 bytes long


    // Return the permit
    return "0x" + permitString
    
}

const inchAPIBaseURL = "https://api.1inch.io/v5.0/56/" // 1inch API base URL
let inchAPIParameters = {
    fromTokenAddress: "0x111111111117dc0aa78b770fa6a738034120c302", // 1inch token address
    toTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    amount: "1000000000000000000", // 1inch token amount
    fromAddress: wallet_address, // wallet address
    slippage: "1", // slippage
    // disableEstimate: true, // disable estimate
    // gasPrice: "1000000000", // gas price
    // gasLimit: "1000000", // gas limit
    // mainRouteParts: 1, // main route parts
    // parts: 1, // parts
    // recipient: wallet_address, // recipient
    // referrerAddress: wallet_address, // referrer address

}


permit().then((permit) => {
    console.log(permit)
    inchAPIParameters.permit = permit
    console.log(inchAPIParameters)

    const inchAPIURL = inchAPIBaseURL + "swap?" + new URLSearchParams(inchAPIParameters).toString()
    console.log(inchAPIURL)

    fetch(inchAPIURL).then((response) => {
        return response.json()
    }
    ).then((data) => {
        console.log(data)
    }
    )

})

