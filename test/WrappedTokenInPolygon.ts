import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("WrappedTokenInPolygon", function () {
  async function deployFixture() {
    const [owner, bridge, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("WrappedTokenInPolygon");
    const token = await Token.deploy(bridge.address);
    await token.waitForDeployment();

    return { token, owner, bridge, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("WrappedTokenInPolygon");
      expect(await token.symbol()).to.equal("WTIP");
    });

    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set the correct bridge address", async function () {
      const { token, bridge } = await loadFixture(deployFixture);
      expect(await token.getBridge()).to.equal(bridge.address);
    });
  });

  describe("Minting", function () {
    it("Should allow bridge to mint tokens", async function () {
      const { token, bridge, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(token.connect(bridge).mintByBridge(otherAccount.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, otherAccount.address, amount);

      expect(await token.balanceOf(otherAccount.address)).to.equal(amount);
    });

    it("Should prevent non-bridge from minting", async function () {
      const { token, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(
        token.connect(otherAccount).mintByBridge(otherAccount.address, amount)
      ).to.be.revertedWithCustomError(token, "OnlyBridge");
    });
  });

  describe("Burning", function () {
    it("Should allow bridge to burn tokens", async function () {
      const { token, bridge, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");
    
      await token.connect(bridge).mintByBridge(otherAccount.address, amount);
    
      await expect(token.connect(bridge).burnByBridge(otherAccount.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(otherAccount.address, ethers.ZeroAddress, amount);
    
      expect(await token.balanceOf(otherAccount.address)).to.equal(0);
    });

    it("Should prevent non-bridge from burning", async function () {
      const { token, bridge, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await token.connect(bridge).mintByBridge(otherAccount.address, amount);
      
      await expect(
        token.connect(otherAccount).burnByBridge(otherAccount.address, amount)
      ).to.be.revertedWithCustomError(token, "OnlyBridge");
    });
  });

  describe("Bridge Management", function () {
    it("Should allow owner to change bridge", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployFixture);
      
      await expect(token.connect(owner).setNewBridge(otherAccount.address))
        .to.emit(token, "NewBridgeSet")
        .withArgs(otherAccount.address);

      expect(await token.getBridge()).to.equal(otherAccount.address);
    });

    it("Should prevent non-owners from changing bridge", async function () {
      const { token, otherAccount } = await loadFixture(deployFixture);
      
      await expect(
        token.connect(otherAccount).setNewBridge(otherAccount.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});