import { expect } from "chai"
import { ethers } from "hardhat"
import { CommunityCanvas } from "../typechain-types"

describe("CommunityCanvas", function () {
  let canvas: CommunityCanvas
  let painter: string

  beforeEach(async function () {
    const [signer] = await ethers.getSigners()
    painter = signer.address
    const factory = await ethers.getContractFactory("CommunityCanvas")
    canvas = (await factory.deploy()) as CommunityCanvas
  })

  describe("Constants", function () {
    it("should have correct canvas dimensions", async function () {
      expect(await canvas.CANVAS_WIDTH()).to.equal(100)
      expect(await canvas.CANVAS_HEIGHT()).to.equal(100)
    })
  })

  describe("paint()", function () {
    it("should paint a pixel and emit Painted event", async function () {
      const tx = await canvas.paint(10, 20, 0xff0000) // Red
      const receipt = await tx.wait()
      expect(receipt).to.not.be.null

      await expect(canvas.paint(10, 20, 0xff0000))
        .to.emit(canvas, "Painted")
        .withArgs(10, 20, 0xff0000, painter, await ethers.provider.getBlockNumber() + 1)
    })

    it("should store pixel data on-chain", async function () {
      await canvas.paint(5, 7, 0x00ff00) // Green
      const [color, painterAddr] = await canvas.getPixel(5, 7)
      expect(color).to.equal(0x00ff00)
      expect(painterAddr).to.equal(painter)
    })

    it("should allow overwriting a pixel (last writer wins)", async function () {
      await canvas.paint(0, 0, 0xff0000) // Red
      await canvas.paint(0, 0, 0x0000ff) // Blue overwrites
      const [color] = await canvas.getPixel(0, 0)
      expect(color).to.equal(0x0000ff)
    })

    it("should revert on out-of-bounds x coordinate", async function () {
      await expect(canvas.paint(100, 0, 0xffffff))
        .to.be.revertedWithCustomError(canvas, "InvalidCoordinates")
        .withArgs(100, 0)
    })

    it("should revert on out-of-bounds y coordinate", async function () {
      await expect(canvas.paint(0, 100, 0xffffff))
        .to.be.revertedWithCustomError(canvas, "InvalidCoordinates")
        .withArgs(0, 100)
    })
  })

  describe("paintBatch()", function () {
    it("should paint multiple pixels in one call", async function () {
      const xs = [0, 1, 2]
      const ys = [0, 1, 2]
      const colors = [0xff0000, 0x00ff00, 0x0000ff]

      await canvas.paintBatch(xs, ys, colors)

      for (let i = 0; i < xs.length; i++) {
        const [color] = await canvas.getPixel(xs[i]!, ys[i]!)
        expect(color).to.equal(colors[i])
      }
    })

    it("should revert on array length mismatch", async function () {
      await expect(canvas.paintBatch([0, 1], [0], [0xff0000, 0x00ff00]))
        .to.be.revertedWith("Array length mismatch")
    })

    it("should revert on out-of-bounds in batch", async function () {
      await expect(canvas.paintBatch([100], [0], [0xff0000]))
        .to.be.revertedWithCustomError(canvas, "InvalidCoordinates")
    })
  })

  describe("getPixels()", function () {
    it("should return multiple pixels in one call", async function () {
      await canvas.paint(10, 10, 0xabcdef)
      await canvas.paint(20, 20, 0x123456)

      const [colors, painters] = await canvas.getPixels([10, 20], [10, 20])
      expect(colors[0]).to.equal(0xabcdef)
      expect(colors[1]).to.equal(0x123456)
      expect(painters[0]).to.equal(painter)
      expect(painters[1]).to.equal(painter)
    })

    it("should return zero values for unpainted pixels", async function () {
      const [colors, painters] = await canvas.getPixels([50], [50])
      expect(colors[0]).to.equal(0) // default uint24 = 0 = black
      expect(painters[0]).to.equal(ethers.ZeroAddress)
    })
  })
})
