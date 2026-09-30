import React, { useState, useEffect, useCallback } from "react";
import { getGatewayUrl, getLocalIpfsFile, IPFS_GATEWAYS, extractCid } from "../utils/ipfs";
import "./Display.css";

const Display = ({ contract, account, refreshTrigger, showToast }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [activeView, setActiveView] = useState("my"); // "my" or "other"
  const [selectedImage, setSelectedImage] = useState(null);
  const [errorNotice, setErrorNotice] = useState("");

  const fetchData = useCallback(
    async (targetAddress) => {
      if (!contract) return;
      const addrToQuery = targetAddress || (activeView === "my" ? account : searchAddress.trim());
      if (!addrToQuery) return;

      setLoading(true);
      setErrorNotice("");

      try {
        const dataArray = await contract.display(addrToQuery);

        if (!dataArray || dataArray.length === 0) {
          setImages([]);
          setLoading(false);
          return;
        }

        // Parse list of image URLs from the contract
        const formatted = await Promise.all(
          dataArray.map(async (item, index) => {
            if (!item || typeof item !== "string") return null;
            const cid = extractCid(item);
            const localData = await getLocalIpfsFile(cid);
            return {
              id: `${addrToQuery}-${index}`,
              original: item,
              cid,
              localData: localData || null,
              gatewayIndex: 0,
            };
          })
        );

        setImages(formatted.filter(Boolean));
      } catch (err) {
        console.error("Display fetch error:", err);
        setImages([]);
        const reason = err?.reason || err?.message || "";
        if (reason.includes("You don't have access") || err?.data?.message?.includes("You don't have access")) {
          setErrorNotice("Access Denied: The owner of this address has not granted you access.");
        } else {
          setErrorNotice("Unable to fetch images from this address.");
        }
      } finally {
        setLoading(false);
      }
    },
    [contract, account, activeView, searchAddress]
  );

  // Auto-fetch whenever account changes or refreshTrigger fires
  useEffect(() => {
    if (contract && account && activeView === "my") {
      fetchData(account);
    }
  }, [contract, account, activeView, refreshTrigger, fetchData]);

  const handleTabSwitch = (view) => {
    setActiveView(view);
    setErrorNotice("");
    if (view === "my") {
      setSearchAddress("");
      if (account) fetchData(account);
    } else {
      setImages([]);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchAddress.trim()) {
      if (showToast) showToast("Please enter an Ethereum address.", "warning");
      return;
    }
    fetchData(searchAddress.trim());
  };

  const handleImageError = (index) => {
    setImages((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const nextGwIndex = item.gatewayIndex + 1;
          if (nextGwIndex < IPFS_GATEWAYS.length) {
            return { ...item, gatewayIndex: nextGwIndex };
          }
          return { ...item, failed: true };
        }
        return item;
      })
    );
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast(`Copied ${label} to clipboard!`, "info");
  };

  return (
    <div className="display-section">
      <div className="display-header-wrap">
        <div className="display-tabs">
          <button
            className={`display-tab ${activeView === "my" ? "active" : ""}`}
            onClick={() => handleTabSwitch("my")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My Uploads
          </button>
          <button
            className={`display-tab ${activeView === "other" ? "active" : ""}`}
            onClick={() => handleTabSwitch("other")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Explore Shared Vault
          </button>
        </div>

        <button
          className="btn-refresh"
          onClick={() => fetchData()}
          disabled={loading || !contract}
          title="Refresh images"
        >
          <svg
            className={loading ? "spin" : ""}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {activeView === "other" && (
        <form onSubmit={handleSearchSubmit} className="search-bar-wrap">
          <div className="search-input-group">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Enter user Ethereum address (0x...) to view shared files"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="search-input mono"
            />
            {searchAddress && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchAddress("")}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn-search-action" disabled={loading}>
            {loading ? "Checking..." : "Inspect Vault"}
          </button>
        </form>
      )}

      {errorNotice && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-content">
            <p className="error-title">Access Restriction</p>
            <p className="error-text">{errorNotice}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="vault-spinner" />
          <p>Querying decentralized smart contract & IPFS...</p>
        </div>
      )}

      {!loading && !errorNotice && images.length === 0 && (
        <div className="empty-vault-state">
          <div className="empty-icon-wrap">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h4>No Images Found in this Vault</h4>
          <p>
            {activeView === "my"
              ? "You haven't uploaded any images yet. Upload an image above to get started!"
              : "No images shared for this address, or the address has not uploaded anything."}
          </p>
        </div>
      )}

      {!loading && images.length > 0 && (
        <div className="gallery-grid">
          {images.map((item, index) => {
            const currentSrc = item.localData || getGatewayUrl(item.original, item.gatewayIndex);
            return (
              <div key={item.id} className="gallery-card">
                <div
                  className="card-media-wrap"
                  onClick={() => setSelectedImage({ src: currentSrc, cid: item.cid, failed: item.failed })}
                >
                  {item.failed ? (
                    <div className="card-placeholder-fallback">
                      <div className="placeholder-icon">📦</div>
                      <span className="placeholder-title">IPFS Vault Item</span>
                      <span className="placeholder-cid mono">{item.cid.slice(0, 10)}...{item.cid.slice(-6)}</span>
                      <span className="placeholder-sub">Verified on Blockchain</span>
                    </div>
                  ) : (
                    <img
                      src={currentSrc}
                      alt={`Vault content #${index + 1}`}
                      className="vault-thumbnail"
                      loading="lazy"
                      onError={() => handleImageError(index)}
                    />
                  )}
                  <div className="card-overlay">
                    <span className="overlay-btn-view">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                      Preview
                    </span>
                  </div>
                </div>

                <div className="card-footer">
                  <span className="card-index-tag">#{index + 1}</span>
                  <div className="card-actions-group">
                    <button
                      className="card-icon-action"
                      onClick={() => copyToClipboard(item.original, "IPFS CID / URL")}
                      title="Copy IPFS URL or Hash"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    <a
                      href={currentSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-icon-action"
                      title="Open full resolution in new tab"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {selectedImage && (
        <div className="lightbox-backdrop" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
            >
              ✕
            </button>
            {selectedImage.failed ? (
              <div className="lightbox-card-fallback">
                <div className="lightbox-fallback-icon">🛡️</div>
                <h3>Decentralized Vault Asset</h3>
                <p className="lightbox-fallback-desc">
                  This item's cryptographic ownership is recorded on the Ethereum blockchain.
                </p>
                <div className="cid-pill mono">
                  CID: {selectedImage.cid}
                </div>
                <div className="lightbox-fallback-tip">
                  💡 <strong>Tip:</strong> To mirror files to the worldwide public IPFS gateway across different devices, add your free Pinata API key in Settings (⚙️).
                </div>
                <a
                  href={selectedImage.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-open-external"
                >
                  Try Gateway Link ↗
                </a>
              </div>
            ) : (
              <img
                src={selectedImage.src}
                alt="Expanded preview"
                className="lightbox-img"
                onError={() => setSelectedImage((prev) => ({ ...prev, failed: true }))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Display;
