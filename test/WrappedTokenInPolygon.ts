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

  describe("Деплой", function () {
    it("Устанавливает правильные матаданные", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("WrappedTokenInPolygon");
      expect(await token.symbol()).to.equal("WTIP");
    });

    it("Устанавливает владельца", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Устанавливает адрес моста", async function () {
      const { token, bridge } = await loadFixture(deployFixture);
      expect(await token.getBridge()).to.equal(bridge.address);
    });
  });

  describe("Минтинг", function () {
    it("Позволяет мосту минтить токены", async function () {
      const { token, bridge, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(token.connect(bridge).mintByBridge(otherAccount.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, otherAccount.address, amount);

      expect(await token.balanceOf(otherAccount.address)).to.equal(amount);
    });

    it("Не дает немосту минтить токены", async function () {
      const { token, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(
        token.connect(otherAccount).mintByBridge(otherAccount.address, amount)
      ).to.be.revertedWithCustomError(token, "OnlyBridge");
    });
  });

  describe("Сжигание", function () {
    it("Сжигание токенов только с адреса моста", async function () {
      const { token, bridge, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");
    
      await token.connect(bridge).mintByBridge(otherAccount.address, amount);
    
      await expect(token.connect(bridge).burnByBridge(otherAccount.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(otherAccount.address, ethers.ZeroAddress, amount);
    
      expect(await token.balanceOf(otherAccount.address)).to.equal(0);
    });

    it("Нет возможности сжечь токены с адреса немоста", async function () {
      const { token, bridge, otherAccount } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await token.connect(bridge).mintByBridge(otherAccount.address, amount);
      
      await expect(
        token.connect(otherAccount).burnByBridge(otherAccount.address, amount)
      ).to.be.revertedWithCustomError(token, "OnlyBridge");
    });
  });

  describe("Управление адресом моста", function () {
    it("Позволяет владельцу менять адрес моста", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployFixture);
      
      await expect(token.connect(owner).setNewBridge(otherAccount.address))
        .to.emit(token, "NewBridgeSet")
        .withArgs(otherAccount.address);

      expect(await token.getBridge()).to.equal(otherAccount.address);
    });

    it("Невладелец не может менять адрес моста", async function () {
      const { token, otherAccount } = await loadFixture(deployFixture);
      
      await expect(
        token.connect(otherAccount).setNewBridge(otherAccount.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});