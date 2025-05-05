import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseTokenInBNB", function () {
  async function deployTokenFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("BaseTokenInBNB");
    const token = await Token.deploy();
    return { token, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should mint initial supply to owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.balanceOf(owner.address)).to.equal(10_000n * 10n**18n);
    });

    it("Should have correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("BaseInBNB");
      expect(await token.symbol()).to.equal("BTIB");
    });
  });

  describe("Minting", function () {
    const mintAmount = 1_000n * 10n**18n;

    it("Should allow owner to mint tokens", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployTokenFixture);
      await expect(token.connect(owner).mint(otherAccount.address, mintAmount))
        .to.changeTokenBalance(token, otherAccount, mintAmount);
    });

    it("Should fail when non-owner tries to mint", async function () {
      const { token, otherAccount } = await loadFixture(deployTokenFixture);
      await expect(
        token.connect(otherAccount).mint(otherAccount.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployTokenFixture);
      await token.connect(owner).transferOwnership(otherAccount.address);
      expect(await token.owner()).to.equal(otherAccount.address);
    });
  });
});