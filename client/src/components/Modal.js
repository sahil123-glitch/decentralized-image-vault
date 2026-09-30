import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import "./Modal.css";

const Modal = ({ setModalOpen, contract, showToast }) => {
  const [addressToAllow, setAddressToAllow] = useState("");
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const fetchAccessList = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const rawList = await contract.shareAccess();
      // Format ethers struct/tuple array
      const list = rawList.map((entry) => {
        const user = entry.user || entry[0];
        const access = entry.access !== undefined ? entry.access : entry[1];
        return { user, access: Boolean(access) };
      });
      setAccessList(list);
    } catch (err) {
      console.error("Error fetching access list:", err);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    fetchAccessList();
  }, [fetchAccessList]);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    const cleanAddress = addressToAllow.trim();

    if (!cleanAddress) {
      if (showToast) showToast("Please enter an Ethereum address.", "warning");
      return;
    }

    if (!ethers.utils.isAddress(cleanAddress)) {
      if (showToast) showToast("Invalid Ethereum address format (must be 0x followed by 40 hex characters).", "error");
      return;
    }

    setActionLoading(true);
    setActionMessage("Granting access in smart contract...");

    try {
      const tx = await contract.allow(cleanAddress);
      setActionMessage("Confirming on blockchain...");
      await tx.wait();

      if (showToast) showToast(`Access granted to ${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}!`, "success");
      setAddressToAllow("");
      await fetchAccessList();
    } catch (err) {
      console.error("Allow error:", err);
      const msg = err.code === 4001 ? "Transaction rejected in MetaMask" : (err.message || "Failed to grant access");
      if (showToast) showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionMessage("");
    }
  };

  const handleRevokeAccess = async (userAddress) => {
    setActionLoading(true);
    setActionMessage(`Revoking access for ${userAddress.slice(0, 6)}...`);

    try {
      const tx = await contract.disallow(userAddress);
      setActionMessage("Confirming revocation on blockchain...");
      await tx.wait();

      if (showToast) showToast(`Access revoked for ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`, "info");
      await fetchAccessList();
    } catch (err) {
      console.error("Disallow error:", err);
      const msg = err.code === 4001 ? "Transaction rejected in MetaMask" : (err.message || "Failed to revoke access");
      if (showToast) showToast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionMessage("");
    }
  };

  const activeGrants = accessList.filter((item) => item.access);

  return (
    <div className="modalBackground" onClick={() => !actionLoading && setModalOpen(false)}>
      <div className="modalContainer card-glass" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitleGroup">
            <div className="shield-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h3>Vault Access Management</h3>
              <p className="modalSub">Grant or revoke permission to view your images</p>
            </div>
          </div>
          <button
            className="closeModalBtn"
            onClick={() => setModalOpen(false)}
            disabled={actionLoading}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleGrantAccess} className="modalBody">
          <div className="formGroup">
            <label className="inputLabel">Grant New Access</label>
            <div className="inputWithBtn">
              <input
                type="text"
                className="addressInput mono"
                placeholder="Enter Ethereum address (0x...)"
                value={addressToAllow}
                onChange={(e) => setAddressToAllow(e.target.value)}
                disabled={actionLoading}
              />
              <button
                type="submit"
                className="btnGrant"
                disabled={!addressToAllow.trim() || actionLoading}
              >
                {actionLoading ? "Processing..." : "Grant Access"}
              </button>
            </div>
          </div>

          {actionLoading && (
            <div className="modalActionNotice">
              <span className="spinner-inline" />
              <span>{actionMessage}</span>
            </div>
          )}

          <div className="accessListSection">
            <div className="listHeader">
              <h4>Authorized Wallets ({activeGrants.length})</h4>
              <button
                type="button"
                className="btnRefreshAccess"
                onClick={fetchAccessList}
                disabled={loading || actionLoading}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="listLoading">Loading permissions...</div>
            ) : activeGrants.length === 0 ? (
              <div className="listEmpty">
                <p>No external wallets currently have access to your vault.</p>
              </div>
            ) : (
              <div className="accessListItems">
                {activeGrants.map((item, idx) => (
                  <div key={item.user + idx} className="accessItem">
                    <div className="userMeta">
                      <div className="userAvatar">
                        {item.user.slice(2, 4).toUpperCase()}
                      </div>
                      <div className="addressWrap">
                        <span className="addressText mono" title={item.user}>
                          {item.user.slice(0, 8)}...{item.user.slice(-6)}
                        </span>
                        <span className="badgeActive">Active</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btnRevoke"
                      onClick={() => handleRevokeAccess(item.user)}
                      disabled={actionLoading}
                      title="Revoke access"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="modalFooter">
          <button
            type="button"
            className="btnCloseFooter"
            onClick={() => setModalOpen(false)}
            disabled={actionLoading}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
