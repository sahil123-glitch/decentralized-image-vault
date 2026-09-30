const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Upload Contract", function () {
  let Upload, upload, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    Upload = await ethers.getContractFactory("Upload");
    upload = await Upload.deploy();
    await upload.deployed();
  });

  it("should allow a user to add and retrieve an image URL", async function () {
    await upload.add(owner.address, "https://ipfs.io/ipfs/QmTestHash123");
    const images = await upload.display(owner.address);
    expect(images.length).to.equal(1);
    expect(images[0]).to.equal("https://ipfs.io/ipfs/QmTestHash123");
  });

  it("should reject display access if unauthorized", async function () {
    await upload.add(owner.address, "https://ipfs.io/ipfs/QmTestHash123");
    await expect(
      upload.connect(user1).display(owner.address)
    ).to.be.revertedWith("You don't have access");
  });

  it("should allow owner to grant and revoke access", async function () {
    await upload.add(owner.address, "https://ipfs.io/ipfs/QmTestHash123");

    // Grant access to user1
    await upload.allow(user1.address);

    // user1 can now see images
    const images = await upload.connect(user1).display(owner.address);
    expect(images.length).to.equal(1);
    expect(images[0]).to.equal("https://ipfs.io/ipfs/QmTestHash123");

    // Check shareAccess list
    const accessList = await upload.shareAccess();
    expect(accessList.length).to.equal(1);
    expect(accessList[0].user).to.equal(user1.address);
    expect(accessList[0].access).to.be.true;

    // Disallow access
    await upload.disallow(user1.address);
    await expect(
      upload.connect(user1).display(owner.address)
    ).to.be.revertedWith("You don't have access");

    // Check shareAccess updated
    const updatedList = await upload.shareAccess();
    expect(updatedList[0].access).to.be.false;
  });
});
