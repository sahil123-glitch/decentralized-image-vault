import React, { useState } from "react";
import { getPinataConfig, savePinataConfig } from "../utils/ipfs";
import "./SettingsModal.css";

const SettingsModal = ({ isOpen, onClose, contractAddress, onSaveContractAddress }) => {
  const currentConfig = getPinataConfig();
  const [jwt, setJwt] = useState(currentConfig.jwt || "");
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || "");
  const [secretKey, setSecretKey] = useState(currentConfig.secretKey || "");
  const [customAddress, setCustomAddress] = useState(contractAddress || "");
  const [activeTab, setActiveTab] = useState("pinata");
  const [savedMessage, setSavedMessage] = useState("");

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    savePinataConfig({ jwt, apiKey, secretKey });
    if (customAddress && onSaveContractAddress) {
      onSaveContractAddress(customAddress.trim());
    }
    setSavedMessage("Settings saved successfully!");
    setTimeout(() => {
      setSavedMessage("");
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem("dgdrive_pinata_jwt");
    localStorage.removeItem("dgdrive_pinata_api_key");
    localStorage.removeItem("dgdrive_pinata_secret_key");
    setJwt("");
    setApiKey("");
    setSecretKey("");
    setSavedMessage("Pinata credentials cleared. Fallback mode enabled.");
    setTimeout(() => setSavedMessage(""), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">⚙️</span>
            <div>
              <h3>System Settings</h3>
              <p className="modal-subtitle">Configure IPFS storage & Contract connection</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "pinata" ? "active" : ""}`}
            onClick={() => setActiveTab("pinata")}
          >
            Pinata IPFS
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "contract" ? "active" : ""}`}
            onClick={() => setActiveTab("contract")}
          >
            Smart Contract
          </button>
        </div>

        <form onSubmit={handleSave} className="settings-body">
          {activeTab === "pinata" && (
            <div className="tab-pane">
              <div className="info-banner">
                <span className="info-icon">💡</span>
                <span>
                  Provide your Pinata credentials below to pin directly to IPFS. If left empty,
                  DgDrive automatically runs in <strong>Decentralized Local Preview Mode</strong> for
                  seamless local testing!
                </span>
              </div>

              <div className="form-group">
                <label>Pinata JWT (Recommended)</label>
                <input
                  type="password"
                  placeholder="Paste your Pinata JWT Token..."
                  value={jwt}
                  onChange={(e) => setJwt(e.target.value)}
                  className="input-field"
                />
                <span className="input-hint">From Pinata API Keys dashboard (Bearer token)</span>
              </div>

              <div className="divider-text">
                <span>OR API Key & Secret</span>
              </div>

              <div className="form-group">
                <label>Pinata API Key</label>
                <input
                  type="text"
                  placeholder="e.g. 6533157d1609..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label>Pinata API Secret</label>
                <input
                  type="password"
                  placeholder="e.g. 1918bb35d7ce1aad51..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {activeTab === "contract" && (
            <div className="tab-pane">
              <div className="info-banner">
                <span className="info-icon">🔗</span>
                <span>
                  The smart contract address deployed on your Ethereum or Hardhat node.
                </span>
              </div>

              <div className="form-group">
                <label>Upload Contract Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="input-field mono"
                />
                <span className="input-hint">
                  Default Hardhat: <code>0x5FbDB2315678afecb367f032d93F642f64180aa3</code>
                </span>
              </div>
            </div>
          )}

          {savedMessage && <div className="alert-success">{savedMessage}</div>}

          <div className="modal-actions">
            {activeTab === "pinata" && (jwt || apiKey) && (
              <button type="button" className="btn-secondary" onClick={handleClear}>
                Reset to Default
              </button>
            )}
            <div className="action-spacer" />
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
