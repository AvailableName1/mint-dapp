import { BigNumber, Contract, ethers } from "ethers";
import { useEffect, useState } from "react";
import { EthersProvider } from "./react-app-env";
import FirstNFT from "./utils/FirstNFT.json";
import { Container, Button, Loading, Link, Text } from "@nextui-org/react";
import { motion } from "framer-motion";

const TWITTER_HANDLE = "t0rbik";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK = "https://testnets.opensea.io/collection/laba-pklly2x5yv";

const variants = {
  usual: { backgroundColor: "#ffffff" },
  minted: {
    backgroundColor: "#4158D0",
    backgroundImage:
      "linear-gradient(12deg, #4158D0 2%, #C850C0 46%, #FFCC70 98%)",
  },
};

interface RootState {
  minted: null | number;
  isRightChain: "rinkeby" | "other" | "needCheck";
  newMint: "no" | "yes";
  mintedAnimation: "show" | "no";
}

function App() {
  const [account, setAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<RootState>({
    minted: null,
    isRightChain: "needCheck",
    newMint: "no",
    mintedAnimation: "no",
  });

  // address of the contract for interaction;
  const CONTRACT_ADDRESS = "0x39b1388Bb5511864275adB3a9Ba95130223D3d0F";

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have metamask!");
        throw new Error("No MetaMask wallet found");
      }

      const accounts: string[] = await ethereum.request!({
        method: "eth_accounts",
      });

      if (accounts.length !== 0) {
        const account = accounts[0];
        setAccount(account);
      } else {
        setAccount("");
        throw new Error("No connected accounts");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkConnectedNetwork = async () => {
    const { ethereum } = window;
    const rinkebyChainId = "0x4";
    if (ethereum) {
      let chainId = await ethereum.request!({ method: "eth_chainId" });
      if (chainId === rinkebyChainId) {
        setState((prevState) => ({ ...prevState, isRightChain: "rinkeby" }));
      } else {
        setState((prevState) => ({ ...prevState, isRightChain: "other" }));
      }
    }
  };

  const getNumberMinted = async () => {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const connectedContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        FirstNFT.abi,
        signer
      );
      let numberMinted = await connectedContract.getNumberMinted();
      setState((prevState) => ({ ...prevState, minted: +numberMinted }));
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Please, install MetaMask");
        throw new Error("no metamask");
      }

      const accounts = await ethereum.request!({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      setAccount(account);
    } catch (e) {
      console.error(e);
    }
  };

  const switchChain = async () => {
    try {
      await window.ethereum!.request!({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x4" }],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const mint = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          FirstNFT.abi,
          signer
        );
        console.log("prepare to pay gas");
        setIsLoading(true);
        let nftTxn = await connectedContract.mint();
        console.log("minting...");
        await nftTxn.wait();
        setIsLoading(false);
        console.log(
          `mined, check https://rinkeby.etherscan.io/tx/${nftTxn.hash}`
        );
      } else {
        throw new Error("no metamask");
      }
    } catch (e) {
      setIsLoading(false);
      console.error(e);
    }
  };

  const renderNotConnectedContainer = () => (
    <Button onPress={connectWallet}>Connect to Wallet</Button>
  );
  const renderNotRightChainContainer = () => (
    <Button onPress={switchChain}>Switch to Rinkeby</Button>
  );
  const renderConnectedContainer = () => (
    <Button
      color={"gradient"}
      disabled={isLoading}
      onPress={mint}
      shadow
      css={{ maxWidth: "max-content" }}
    >
      {isLoading ? <Loading /> : "Mint"}
    </Button>
  );

  /* walletConnection, ChainConnection check; Fetching minted number after checks;
  listening to to connection or chain changes */
  useEffect(() => {
    const initialise = async () => {
      await checkIfWalletIsConnected();
      await checkConnectedNetwork();
      await getNumberMinted();
    };
    const handleChainChanged = (_chainId: string) => {
      window.location.reload();
    };
    initialise();
    if (window.ethereum) {
      (window.ethereum as EthersProvider).on("accountsChanged", async () => {
        await initialise();
      });
      (window.ethereum as EthersProvider).on(
        "chainChanged",
        handleChainChanged
      );
    }
    return () => {
      if (window.ethereum) {
        (window.ethereum as EthersProvider).removeListener(
          "accountsChanged",
          async () => {
            await initialise();
          }
        );
        (window.ethereum as EthersProvider).removeListener(
          "chainChanged",
          handleChainChanged
        );
      }
    };
  }, []);

  //
  useEffect(() => {
    const { ethereum } = window;
    let connectedContract: Contract;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      connectedContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        FirstNFT.abi,
        signer
      );
      connectedContract.on("NewMint", (sender: string, _tokenId: BigNumber) => {
        async function handleNewMint() {
          if (sender.toLowerCase() === account) {
            setState((prevState) => ({
              ...prevState,
              newMint: "yes",
              mintedAnimation: "show",
            }));
            setTimeout(
              () =>
                setState((prevState) => ({
                  ...prevState,
                  newMint: "no",
                  mintedAnimation: "no",
                })),
              5000
            );
          }
          await getNumberMinted();
        }
        handleNewMint();
      });
    }
    return () => {
      connectedContract.removeAllListeners("NewMint");
    };
  }, [account]);

  return (
    <motion.main
      initial={{ backgroundColor: "#ffffff" }}
      animate={state.mintedAnimation === "no" ? "usual" : "minted"}
      variants={variants}
      style={{ minHeight: "100vh" }}
      transition={{ duration: 1 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Container display='flex' direction='column' justify='center'>
          <Text h1 weight='bold'>
            Laba Dada MINT
          </Text>
          <Text h5>
            created by <Link href={TWITTER_LINK}>t0rb1k</Link>
          </Text>
          <Container
            fluid
            display='flex'
            direction='column'
            justify='center'
            alignItems='center'
            css={{ gap: "$8" }}
          >
            <Link href={OPENSEA_LINK} target='_blank' rel='noreferrer' block>
              🌊 View Collection on OpenSea
            </Link>
            {account &&
              state.isRightChain === "rinkeby" &&
              renderConnectedContainer()}
            {!account &&
              state.isRightChain === "rinkeby" &&
              renderNotConnectedContainer()}
            {state.isRightChain === "other" && renderNotRightChainContainer()}
            <Text>
              Total minted:{" "}
              {state.minted === null ? "connect wallet" : `${state.minted}/42`}
            </Text>
          </Container>
        </Container>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: "-100%" }}
        animate={state.newMint === "no" ? undefined : { opacity: 1, x: "16vw" }}
        transition={{ duration: 0.7 }}
        style={{
          border: "1px solid black",
          borderRadius: "8px",
          padding: "4px",
          maxWidth: "fit-content",
          backgroundColor: "rgba(255, 255, 255, 0.4)",
        }}
      >
        <Text>Minted your NFT!</Text>
      </motion.div>
    </motion.main>
  );
}

export default App;
