import React, { useState, useRef } from "react";
import { uploadFileToIPFS, hasValidPinataConfig } from "../utils/ipfs";
import "./FileUpload.css";

const FileUpload = ({ contract, account, provider, onUploadSuccess, showToast }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const processSelectedFile = (selected) => {
    if (!selected) return;
    const isImage = selected.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|heic)$/i.test(selected.name);
    if (!isImage) {
      if (showToast) showToast("Please select a valid image file (PNG, JPG, SVG, GIF, WebP).", "error");
      return;
    }
    if (selected.name.toLowerCase().endsWith(".heic")) {
      if (showToast) showToast("Tip: .HEIC is Apple-specific. For web preview, JPG or PNG works best!", "info");
    }
    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = (e) => {
    e?.stopPropagation();
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      if (showToast) showToast("Please select an image first.", "warning");
      return;
    }
    if (!account) {
      if (showToast) showToast("Please connect your MetaMask wallet before uploading.", "warning");
      return;
    }
    if (!contract) {
      if (showToast) showToast("Smart contract connection not ready.", "error");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to IPFS / Fallback
      setUploadStep("Pinning image to IPFS decentralized storage...");
      const ipfsResult = await uploadFileToIPFS(file, (msg) => setUploadStep(msg));

      const storedUrl = ipfsResult.url;

      // 2. Record in Smart Contract
      setUploadStep("Please confirm the transaction in MetaMask...");
      const tx = await contract.add(account, storedUrl);

      setUploadStep("Confirming transaction on blockchain...");
      await tx.wait();

      if (showToast) {
        showToast(
          ipfsResult.source === "pinata"
            ? "Image uploaded and permanently pinned to IPFS!"
            : "Image uploaded and recorded on the blockchain!",
          "success"
        );
      }

      // Clear form
      clearSelection();

      // Trigger automatic gallery refresh
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error("Upload error:", err);
      let message = "Upload failed.";
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        message = "Transaction was rejected in MetaMask.";
      } else if (err.message) {
        message = err.message;
      }
      if (showToast) showToast(message, "error");
    } finally {
      setUploading(false);
      setUploadStep("");
    }
  };

  const isPinataConfigured = hasValidPinataConfig();

  return (
    <div className="upload-section">
      <div className="card-glass upload-card">
        <div className="upload-header">
          <div className="upload-title-badge">
            <span className="badge-dot" />
            <span>Decentralized Vault</span>
          </div>
          <div className="storage-mode-indicator">
            {isPinataConfigured ? (
              <span className="status-pill pinata-active" title="Using Pinata IPFS Gateway">
                ⚡ Pinata IPFS Active
              </span>
            ) : (
              <span className="status-pill fallback-active" title="Direct Decentralized Fallback enabled">
                🛡️ Direct Vault Mode
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleUpload}>
          <div
            className={`dropzone ${isDragging ? "dragging" : ""} ${previewUrl ? "has-preview" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
              disabled={!account || uploading}
            />

            {previewUrl ? (
              <div className="preview-container">
                <img src={previewUrl} alt="Upload preview" className="preview-image" />
                <div className="preview-meta">
                  <div className="file-info">
                    <p className="file-name" title={file.name}>{file.name}</p>
                    <p className="file-size">{formatFileSize(file.size)}</p>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      className="btn-remove-preview"
                      onClick={clearSelection}
                      title="Select different image"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="upload-icon-circle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <h4 className="dropzone-title">
                  {account ? "Drag and drop your image here" : "Connect wallet to upload"}
                </h4>
                <p className="dropzone-sub">
                  Supports PNG, JPG, WebP, SVG & GIF • Encrypted blockchain ownership
                </p>
                {account && (
                  <button
                    type="button"
                    className="btn-browse"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Browse Files
                  </button>
                )}
              </div>
            )}
          </div>

          {uploading && (
            <div className="upload-progress-box">
              <div className="spinner-sm" />
              <span className="progress-text">{uploadStep}</span>
            </div>
          )}

          <div className="upload-actions">
            <button
              type="submit"
              className="btn-upload-submit"
              disabled={!file || !account || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-inline" />
                  Processing...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12l7-7 7 7"/>
                  </svg>
                  Upload & Secure to Blockchain
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileUpload;
