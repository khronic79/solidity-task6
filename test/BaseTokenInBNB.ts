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

  describe("Деплой", function () {
    it("Устанавливает владельца", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Минтит токены владельцу", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.balanceOf(owner.address)).to.equal(10_000n * 10n**18n);
    });

    it("Устанавливает правильно метаданные", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("BaseInBNB");
      expect(await token.symbol()).to.equal("BTIB");
    });
  });

  describe("Минтинг", function () {
    const mintAmount = 1_000n * 10n**18n;

    it("Дает владельцу минтить токены", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployTokenFixture);
      await expect(token.connect(owner).mint(otherAccount.address, mintAmount))
        .to.changeTokenBalance(token, otherAccount, mintAmount);
    });

    it("Не дает невладельцу минтить токены", async function () {
      const { token, otherAccount } = await loadFixture(deployTokenFixture);
      await expect(
        token.connect(otherAccount).mint(otherAccount.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});