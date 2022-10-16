import "./App.css";
import Header from "./components/header/Header";
import MyStake from "./components/MyStake/MyStake";
import StakeHistory from "./components/StakeHistory/StakeHistory";
import { useState, useEffect } from "react";
import Footer from "./components/Footer/Footer";
import { ethers, utils, Contract } from "ethers";
import { formatDate } from "./utils/helpers";
import BRTTokenAbi from "./utils/web3/abi.json";
const BRTTokenAddress = "0xaabb9439b0962dfe1430559ba2d92078152024f8";

function App() {
  // a flag for knowing whether or not a user is connected
  const [connected, setConnected] = useState(false);

  // user account details
  const [userInfo, setUserInfo] = useState({
    matic_balance: 0,
    token_balance: 0,
    address: null,
  });

  // the amount of token the user have staked
  const [stakeAmount, setStakeAmount] = useState(null);

  // the amount of reward the user has accumulate on his stake
  const [rewardAmount, setRewardAmount] = useState(null);

  const [userStake, setUserStake] = useState([]);
  const [userInput, setUserInput] = useState("");

  // the value of token the user is willing to state
  const [stakeInput, setStakeInput] = useState("");

  // the value of token the user wants to withdraw
  const [withdrawInput, setWithdrawInput] = useState("");

  // all stake history data displayed on the history table
  const [stateHistory, setStakeHistory] = useState([]);

  // helper function for getting the matic and token balance, given an address
  const getAccountDetails = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const userMaticBal = await provider.getBalance(address);
      const BRTContractInstance = new Contract(
        BRTTokenAddress,
        BRTTokenAbi,
        provider
      );

      const userBRTBalance = await BRTContractInstance.balanceOf(address);
      await getStake();

      return { userBRTBalance, userMaticBal };
    } catch (err) {
      console.log(err);
    }
  };

  const getStake = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const BRTContractInstance = new Contract(
      BRTTokenAddress,
      BRTTokenAbi,
      signer
    );
    const mystake = await BRTContractInstance.myStake();

    const stake = utils.formatUnits(mystake.stakeAmount, 18);
    setStakeAmount(stake);

    ///

    // getting the last stake in seconds
    const lastestStake = formatDate(mystake.time.toString());
    const newStakeTime = new Date(lastestStake);
    const stakeSeconds = Math.floor(newStakeTime.getTime() / 1000);

    // getting the current day in seconds
    const currentDay = new Date();
    const currentDaySeconds = Math.floor(currentDay.getTime() / 1000);

    // getting the difference between the lastest stake and the current day
    const timeDifference = currentDaySeconds - stakeSeconds;

    // showing reward after 3 days otherwise showing 0
    if (timeDifference >= 259200) {
      const reward = 0.0000000386 * timeDifference * stake;
      setRewardAmount(reward.toFixed(3));
    } else setRewardAmount("00.00");
  };

  // handler for when a switches from one account to another or completely disconnected
  const handleAccountChanged = async (accounts) => {
    if (!!accounts.length) {
      const networkId = await window.ethereum.request({
        method: "eth_chainId",
      });
      if (Number(networkId) !== 80001) return;
      // const accountDetails = await getAccountDetails(accounts[0]);

      setConnected(true);
    } else {
      setConnected(false);
      setUserInfo({
        matic_balance: 0,
        token_balance: 0,
        address: null,
      });
    }
  };

  // handler for handling chain/network changed
  const handleChainChanged = async (chainid) => {
    if (Number(chainid) !== 80001) {
      setConnected(false);
      setUserInfo({
        matic_balance: 0,
        token_balance: 0,
        address: null,
      });

      return alert(
        "You are connected to the wrong network, please switch to polygn mumbai"
      );
    } else {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (!accounts.length) return;
      const accountDetails = await getAccountDetails(accounts[0]);
      setUserInfo({
        matic_balance: accountDetails.userMaticBal,
        token_balance: accountDetails.userBRTBalance,
        address: accounts[0],
      });

      setConnected(true);
    }
  };

  // an handler for eagerly connect user and fetching their data
  const eagerConnect = async () => {
    const networkId = await window.ethereum.request({ method: "eth_chainId" });
    if (Number(networkId) !== 80001) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (!accounts.length) return;
    const accountDetails = await getAccountDetails(accounts[0]);
    setUserInfo({
      matic_balance: accountDetails.userMaticBal,
      token_balance: accountDetails.userBRTBalance,
      address: accounts[0],
    });

    setConnected(true);
  };

  const init = async () => {
    const customProvider = new ethers.providers.JsonRpcProvider(
      process.env.REACT_APP_RPC_URL
    );
    const BRTContractInstance = new Contract(
      BRTTokenAddress,
      BRTTokenAbi,
      customProvider
    );
    const stakeHistory = await BRTContractInstance.queryFilter("stakeEvent");
    const history = [];

    stakeHistory.forEach((data) => {
      history.unshift({
        amount: data.args[1],
        account: data.args[0],
        time: data.args[2].toString(),
        type: data.args[3],
      });
    });

    setStakeHistory(history);

    BRTContractInstance.on("stakeEvent", (account, amount, time, type) => {
      const newStake = {
        amount: amount,
        account: account,
        time: time.toString(),
        type: type,
      };

      setStakeHistory((prev) => [newStake, ...prev]);
    });
  };

  useEffect(
    () => {
      init();
      if (!window.ethereum) return;
      window.ethereum.on("connect", eagerConnect);
      // binding handler to account changed event
      window.ethereum.on("accountsChanged", handleAccountChanged);

      window.ethereum.on("chainChanged", handleChainChanged);
    },
    /* eslint-disable */
    []
  );

  const connectWallet = async () => {
    if (!!window.ethereum || !!window.web3) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } else {
      alert("please use an etherum enabled browser");
    }
  };

  const onChangeInput = ({ target }) => {
    switch (target.id) {
      case "stake":
        setStakeInput(target.value);
        break;

      case "unstake":
        setWithdrawInput(target.value);
        break;

      case "user_input":
        setUserInput(target.value);
        break;

      default:
        break;
    }
  };

  const onClickStake = async (e) => {
    e.preventDefault();
    if (stakeInput < 0) return alert("you cannot stake less than 0 BRT");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const BRTContractInstance = new Contract(
      BRTTokenAddress,
      BRTTokenAbi,
      signer
    );
    const weiValue = utils.parseEther(stakeInput);
    const stakeTx = await BRTContractInstance.stakeBRT(weiValue);

    const stakeTxHash = await provider.getTransaction(stakeTx.hash);
    const response = await stakeTx.wait();

    const address = response.events[1].args[0];
    const amountStaked = response.events[1].args[1].toString();
    const time = response.events[1].args[2].toString();
    //set balance functionalities

    const accounts = await provider.listAccounts();
    if (!accounts.length) return;
    const accountDetails = await getAccountDetails(accounts[0]);
    await getStake();

    setUserInfo({
      matic_balance: accountDetails.userMaticBal,
      token_balance: accountDetails.userBRTBalance,
      address: accounts[0],
    });

    setConnected(true);
  };

  const onClickWithdraw = async (e) => {
    e.preventDefault();

    if (withdrawInput < 0) return alert("you cannot withdraw less than 0 BRT");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const BRTContractInstance = new Contract(
      BRTTokenAddress,
      BRTTokenAbi,
      signer
    );

    //unstaking
    const unStakingWeiValue = utils.parseEther(withdrawInput);
    const UnstakeTX = await BRTContractInstance.withdraw(unStakingWeiValue);
    const Unstakeresponse = await unStakingWeiValue.wait();
    // const stakeTxHash = await provider.getTransaction(UnstakeTX.hash);

    const addressWithdrawal = Unstakeresponse.events[1].args[0];
    const amountUnStaked = Unstakeresponse.events[1].args[1].toString();
    const timeUnstake = Unstakeresponse.events[1].args[2].toString();
    //set balance functionalities
    const accounts = await provider.listAccounts();
    if (!accounts.length) return;
    const accountDetails = await getAccountDetails(accounts[0]);
    await getStake();

    setUserInfo({
      matic_balance: accountDetails.userMaticBal,
      token_balance: accountDetails.userBRTBalance,
      address: accounts[0],
    });

    setConnected(true);
    setStakeInput("");
  };

  const clickGetUserStruct = async (e) => {
    e.preventDefault();
    console.log("Give me:", userInput);
    const customProvider = new ethers.providers.JsonRpcProvider(
      process.env.REACT_APP_RPC_URL
    );
    const BRTContractInstance = new Contract(
      BRTTokenAddress,
      BRTTokenAbi,
      customProvider
    );

    const User = await BRTContractInstance.getStakeByAddress(userInput);
    console.log(User);

    setUserStake({
      userAddress: User.staker,
      userAmount: utils.formatUnits(User.stakeAmount.toString()),
      userTime: formatDate(User.time.toString()),
    });
  };

  return (
    <div className="App">
      <Header
        connectWallet={connectWallet}
        connected={connected}
        userInfo={userInfo}
      />
      <main className="main">
        <MyStake
          stakeInput={stakeInput}
          withdrawInput={withdrawInput}
          userInput={userInput}
          onChangeInput={onChangeInput}
          onClickStake={onClickStake}
          onClickWithdraw={onClickWithdraw}
          clickGetUserStruct={clickGetUserStruct}
          stakeAmount={stakeAmount}
          userStake={userStake}
          rewardAmount={rewardAmount}
          connected={connected}
        />
        <StakeHistory stakeData={stateHistory} />
      </main>
      <Footer />
    </div>
  );
}

export default App;
