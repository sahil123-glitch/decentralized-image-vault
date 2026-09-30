const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Upload = await hre.ethers.getContractFactory("Upload");
  const upload = await Upload.deploy();

  await upload.deployed();

  console.log("✅ Upload contract deployed successfully!");
  console.log("📍 Contract address:", upload.address);

  // Automatically write the deployed address for the React client
  const addressFilePath = path.join(__dirname, "..", "client", "src", "contractAddress.json");
  const data = {
    address: upload.address,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(addressFilePath, JSON.stringify(data, null, 2));
  console.log("📄 Saved contract address to client/src/contractAddress.json");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

