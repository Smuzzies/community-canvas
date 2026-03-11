// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommunityCanvas
 * @notice A 100x100 pixel community canvas on VeChain.
 *         Anyone can paint any pixel with any color (last writer wins).
 *         Only the current color is stored on-chain (one uint24 per pixel =
 *         one storage slot per pixel, minimising SSTORE gas cost).
 *         Full paint history — including painter address and block number —
 *         is permanently available via the Painted event log.
 */
contract CommunityCanvas {
    uint16 public constant CANVAS_WIDTH = 100;
    uint16 public constant CANVAS_HEIGHT = 100;

    // pixels[x][y] => packed RGB color as uint24 (0xRRGGBB)
    // Storing only the color keeps each pixel to a single storage slot.
    mapping(uint16 => mapping(uint16 => uint24)) private _pixels;

    // Full paint history lives in events — painter and blockNumber are
    // permanently queryable on-chain without being stored in the mapping.
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

        _pixels[x][y] = color;

        emit Painted(x, y, color, msg.sender, uint32(block.number));
    }

    /**
     * @notice Paint multiple pixels in a single call.
     *         Arrays must be equal length.
     */
    function paintBatch(
        uint16[] calldata xs,
        uint16[] calldata ys,
        uint24[] calldata colors
    ) external {
        uint256 len = xs.length;
        require(len == ys.length && len == colors.length, "Array length mismatch");

        for (uint256 i = 0; i < len; i++) {
            uint16 x = xs[i];
            uint16 y = ys[i];
            if (x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) {
                revert InvalidCoordinates(x, y);
            }
            _pixels[x][y] = colors[i];
            emit Painted(x, y, colors[i], msg.sender, uint32(block.number));
        }
    }

    /**
     * @notice Read the current color of a single pixel.
     */
    function getPixel(uint16 x, uint16 y)
        external
        view
        returns (uint24 color)
    {
        return _pixels[x][y];
    }

    /**
     * @notice Read the current colors of multiple pixels in one call.
     */
    function getPixels(uint16[] calldata xs, uint16[] calldata ys)
        external
        view
        returns (uint24[] memory colors)
    {
        uint256 len = xs.length;
        require(len == ys.length, "Array length mismatch");

        colors = new uint24[](len);
        for (uint256 i = 0; i < len; i++) {
            colors[i] = _pixels[xs[i]][ys[i]];
        }
    }
}
