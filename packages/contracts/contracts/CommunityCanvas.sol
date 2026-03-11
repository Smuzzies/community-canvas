// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommunityCanvas
 * @notice A 100x100 pixel community canvas on VeChain.
 *         Anyone can paint any pixel with any color (last writer wins).
 *         Pixel state is stored on-chain for direct reads without indexing.
 *         Colors are stored as packed uint24 RGB values (gas efficient).
 */
contract CommunityCanvas {
    uint16 public constant CANVAS_WIDTH = 100;
    uint16 public constant CANVAS_HEIGHT = 100;

    struct PixelData {
        uint24 color;      // Packed RGB: 0xRRGGBB
        address painter;   // Who last painted this pixel
        uint32 blockNumber; // Block when last painted
    }

    // pixels[x][y] => PixelData
    mapping(uint16 => mapping(uint16 => PixelData)) private _pixels;

    event Painted(
        uint16 indexed x,
        uint16 indexed y,
        uint24 color,
        address indexed painter,
        uint32 blockNumber
    );

    error InvalidCoordinates(uint16 x, uint16 y);

    /**
     * @notice Paint a single pixel.
     * @param x X coordinate (0–99)
     * @param y Y coordinate (0–99)
     * @param color Packed RGB color as uint24 (0xRRGGBB)
     */
    function paint(uint16 x, uint16 y, uint24 color) external {
        if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
            revert InvalidCoordinates(x, y);
        }

        uint32 blockNum = uint32(block.number);
        _pixels[x][y] = PixelData({
            color: color,
            painter: msg.sender,
            blockNumber: blockNum
        });

        emit Painted(x, y, color, msg.sender, blockNum);
    }

    /**
     * @notice Paint multiple pixels in a single call.
     *         Pairs of (x, y, color) — arrays must be equal length.
     */
    function paintBatch(
        uint16[] calldata xs,
        uint16[] calldata ys,
        uint24[] calldata colors
    ) external {
        uint256 len = xs.length;
        require(len == ys.length && len == colors.length, "Array length mismatch");

        uint32 blockNum = uint32(block.number);
        for (uint256 i = 0; i < len; i++) {
            uint16 x = xs[i];
            uint16 y = ys[i];
            if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
                revert InvalidCoordinates(x, y);
            }
            _pixels[x][y] = PixelData({
                color: colors[i],
                painter: msg.sender,
                blockNumber: blockNum
            });
            emit Painted(x, y, colors[i], msg.sender, blockNum);
        }
    }

    /**
     * @notice Read a single pixel.
     */
    function getPixel(uint16 x, uint16 y)
        external
        view
        returns (uint24 color, address painter, uint32 blockNumber)
    {
        PixelData storage p = _pixels[x][y];
        return (p.color, p.painter, p.blockNumber);
    }

    /**
     * @notice Read multiple pixels in one call (for initial canvas load).
     *         Returns parallel arrays: colors, painters, blockNumbers.
     */
    function getPixels(uint16[] calldata xs, uint16[] calldata ys)
        external
        view
        returns (
            uint24[] memory colors,
            address[] memory painters,
            uint32[] memory blockNumbers
        )
    {
        uint256 len = xs.length;
        require(len == ys.length, "Array length mismatch");

        colors = new uint24[](len);
        painters = new address[](len);
        blockNumbers = new uint32[](len);

        for (uint256 i = 0; i < len; i++) {
            PixelData storage p = _pixels[xs[i]][ys[i]];
            colors[i] = p.color;
            painters[i] = p.painter;
            blockNumbers[i] = p.blockNumber;
        }
    }
}
