import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import UploadArtifact from "./artifacts/contracts/Upload.sol/Upload.json";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import SettingsModal from "./components/SettingsModal";
import deployedInfo from "./contractAddress.json";
import "./App.css";

const DEFAULT_CONTRACT =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  deployedInfo?.address ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const LOCAL_CHAINS = ["0x539", "0x7a69"]; // 1337 and 31337

function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [networkName, setNetworkName] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contractAddress, setContractAddress] = useState(
    localStorage.getItem("dgdrive_contract_address") || DEFAULT_CONTRACT
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setupContractAndWallet = useCallback(
    async (ethProvider) => {
      try {
        const web3Provider = new ethers.providers.Web3Provider(ethProvider);
        const signer = web3Provider.getSigner();
        const address = await signer.getAddress();
        const network = await web3Provider.getNetwork();

        let formattedBalance = "";
        try {
          const rawBal = await web3Provider.getBalance(address);
          formattedBalance = parseFloat(ethers.utils.formatEther(rawBal)).toFixed(3) + " ETH";
        } catch (e) {
          console.warn("Could not fetch balance:", e);
        }

        const uploadContract = new ethers.Contract(
          contractAddress,
          UploadArtifact.abi,
          signer
        );

        setAccount(address);
        setBalance(formattedBalance);
        setNetworkName(network.name === "unknown" ? `Chain ${network.chainId}` : network.name);
        setContract(uploadContract);
        setProvider(web3Provider);
      } catch (err) {
        console.error("Setup contract error:", err);
      }
    },
    [contractAddress]
  );

  const ensureCorrectNetwork = async () => {
    if (!window.ethereum) return;
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (LOCAL_CHAINS.includes(chainId)) {
        return;
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x539" }],
      });
    } catch (switchError) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x539",
                chainName: "Hardhat Local (1337)",
                nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                rpcUrls: ["http://127.0.0.1:8545"],
              },
            ],
          });
        } catch (addErr) {
          console.warn("Could not add local chain:", addErr);
        }
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast("MetaMask is not detected. Please install the MetaMask extension.", "error");
      return;
    }

    setConnecting(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await ensureCorrectNetwork();
      await setupContractAndWallet(window.ethereum);
      showToast("Wallet connected successfully!", "success");
    } catch (error) {
      console.error("Connect error:", error);
      if (error.code === 4001) {
        showToast("Connection rejected in MetaMask.", "warning");
      } else {
        showToast(error.message || "Failed to connect wallet.", "error");
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveContractAddress = (newAddr) => {
    setContractAddress(newAddr);
    localStorage.setItem("dgdrive_contract_address", newAddr);
    if (provider) {
      setupContractAndWallet(window.ethereum);
    }
    showToast("Smart contract address updated!", "success");
  };

  const copyAddress = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    showToast("Account address copied to clipboard!", "info");
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const eth = window.ethereum;
    const onAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setupContractAndWallet(eth);
      } else {
        setAccount("");
        setContract(null);
        setBalance("");
      }
    };

    const onChainChanged = () => {
      window.location.reload();
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);

    // Auto-restore session if connected previously
    eth
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts && accounts.length > 0) {
          setupContractAndWallet(eth);
        }
      })
      .catch((e) => console.log("Session restore check:", e));

    return () => {
      eth.removeListener("accountsChanged", onAccountsChanged);
      eth.removeListener("chainChanged", onChainChanged);
    };
  }, [setupContractAndWallet]);

  return (
    <div className="app-container">
      {/* Dynamic Ambient Background Orbs */}
      <div className="ambient-mesh">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
      </div>

      {/* Toast Notification Stack */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "warning" && "!"}
              {toast.type === "info" && "ℹ"}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Navigation Header */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="brand-logo-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">DgDrive</span>
            <span className="brand-badge">3.0</span>
          </div>
        </div>

        <div className="nav-actions">
          {networkName && (
            <div className="network-pill" title="Connected EVM Network">
              <span className="network-dot" />
              <span>{networkName}</span>
            </div>
          )}

          <button
            className="nav-btn-icon"
            onClick={() => setSettingsOpen(true)}
            title="IPFS & Contract Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {account && (
            <button
              className="nav-btn-share"
              onClick={() => setModalOpen(true)}
              title="Manage access permissions"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Manage Sharing
            </button>
          )}

          {account ? (
            <div className="wallet-pill" onClick={copyAddress} title="Click to copy address">
              <span className="wallet-avatar">{account.slice(2, 4).toUpperCase()}</span>
              <div className="wallet-details">
                <span className="wallet-address mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                {balance && <span className="wallet-balance">{balance}</span>}
              </div>
              <svg className="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>
          ) : (
            <button
              className="btn-connect"
              onClick={connectWallet}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <span className="spinner-inline" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="4" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Hero Showcase */}
      <section className="hero-section">
        <div className="hero-badge">
          <span className="badge-glow" />
          <span>Ethereum + IPFS Web3 Drive</span>
        </div>
        <h1 className="hero-heading">
          Decentralized Image Vault <br />
          <span className="gradient-text">& Peer-to-Peer Sharing</span>
        </h1>
        <p className="hero-subheading">
          Upload and pin your media permanently to IPFS. Grant or revoke access cryptographically
          through transparent Solidity smart contracts without central intermediaries.
        </p>

        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-value">100%</span>
            <span className="stat-label">Decentralized Storage</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <span className="stat-value">Smart Contract</span>
            <span className="stat-label">On-chain Access Control</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <span className="stat-value">IPFS Gateways</span>
            <span className="stat-label">Immutable Distribution</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="main-content">
        <FileUpload
          account={account}
          provider={provider}
          contract={contract}
          onUploadSuccess={() => setRefreshTrigger((prev) => prev + 1)}
          showToast={showToast}
        />

        <Display
          contract={contract}
          account={account}
          refreshTrigger={refreshTrigger}
          showToast={showToast}
        />
      </main>

      {/* Modals */}
      {modalOpen && (
        <Modal
          setModalOpen={setModalOpen}
          contract={contract}
          showToast={showToast}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          contractAddress={contractAddress}
          onSaveContractAddress={handleSaveContractAddress}
        />
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-brand">DgDrive 3.0</span>
            <span className="footer-tag">Ethereum IPFS Image Vault</span>
          </div>
          <div className="footer-right">
            <span className="contract-tag mono" title={contractAddress}>
              Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
