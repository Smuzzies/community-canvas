# Community Canvas

A shared 100×100 pixel canvas on the VeChain blockchain. Pick a color, place a pixel, sign a transaction — last painter wins. Every pixel is permanently recorded on-chain, and anyone can overwrite any pixel at any time.

Live at **[canvas.smuzzies.com](https://canvas.smuzzies.com)**

---

## What it does

- 100×100 grid where each cell is a pixel stored on VeChain mainnet
- Connect any VeChain wallet (VeWorld, Sync2, WalletConnect)
- Pick a color from the palette or use a custom color
- Queue multiple pixels and submit them all in a single transaction
- Canvas updates every 10 seconds from on-chain events
- Mobile-friendly: tap the canvas to place a crosshair, use the D-pad to navigate, press Paint to queue
- Download the current canvas as a PNG

---

## Stack

- **Monorepo**: Turborepo + Yarn workspaces
- **Frontend**: Next.js 14 (static export), Chakra UI v3, VeChain Kit, React Query
- **Contracts**: Solidity 0.8.20, Hardhat, VeChain SDK Hardhat plugin
- **Network**: VeChain mainnet

---

## Project structure

```
community-canvas/
├── apps/
│   └── frontend/          # Next.js app
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       └── .env.example   # Copy to .env.local and fill in values
└── packages/
    └── contracts/         # Solidity contract + Hardhat config
        ├── contracts/CommunityCanvas.sol
        └── scripts/deploy.ts
```

---

## 1. Prerequisites

- Node.js 20.x
- Yarn 1.22.x (`npm install -g yarn`)
- A VeChain wallet mnemonic with VTHO on mainnet for deployment

---

## 2. Install dependencies

```bash
yarn install
```

---

## 3. Deploy the contract

The contract only needs to be deployed once. After deployment the address goes into your frontend `.env.local`.

### Set your mnemonic

```bash
export MNEMONIC="your twelve word mnemonic phrase here"
```

> **Never commit your mnemonic.** Use an environment variable or a secrets manager.

### Compile

```bash
yarn contracts:compile
```

### Deploy to mainnet

```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network vechain_mainnet
```

The output will print the deployed contract address:

```
Deploying CommunityCanvas with account: 0x...
CommunityCanvas deployed to: 0x...

Add to apps/frontend/.env.local:
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Deploy to testnet (optional)

```bash
npx hardhat run scripts/deploy.ts --network vechain_testnet
```

### Run tests against a local Solo node

```bash
# Start VeChain Solo (Docker)
docker run -d -p 8669:8669 vechain/thor:latest solo --on-demand

npx hardhat test --network vechain_solo
```

---

## 4. Configure the frontend

Copy the example env file:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

Edit `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_NETWORK=main
NEXT_PUBLIC_NODE_URL=https://node-mainnet.vechain.energy
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CONTRACT_ADDRESS=0xyour_deployed_contract_address
```

> `NEXT_PUBLIC_NODE_URL` must be a CORS-enabled node. `mainnet.vechain.org` returns 403 in browsers. `node-mainnet.vechain.energy` works out of the box.

> `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is optional — get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com).

---

## 5. Run locally

```bash
yarn dev
```

Frontend runs at `http://localhost:3000`.

---

## 6. Build for production

```bash
yarn build
```

Static files are output to `apps/frontend/out/`. This directory is a self-contained static site — no Node.js server required.

---

## 7. Deploy to a server

Any static file server works. Example using `serve` and PM2 behind nginx:

### Install dependencies on the server

```bash
npm install -g serve pm2
```

### Copy the build output

```bash
rsync -avz --delete apps/frontend/out/ user@yourserver:/var/www/community-canvas/
```

### Start with PM2

```bash
pm2 start "serve -s /var/www/community-canvas -l 3000" --name canvas
pm2 save
```

### Nginx config

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Add SSL with Certbot:

```bash
certbot --nginx -d yourdomain.com
```

---

## Contract

| | |
|---|---|
| **Address** | `0xab1b6732fc6b162653261968f91c67cf0968da41` |
| **Network** | VeChain Mainnet |
| **Explorer** | [vechainstats.com](https://vechainstats.com/account/0xab1b6732fc6b162653261968f91c67cf0968da41/) |

### Key functions

```solidity
// Paint a single pixel
function paint(uint8 x, uint8 y, uint24 color) external

// Paint multiple pixels in one transaction
function paintBatch(uint8[] x, uint8[] y, uint24[] colors) external

// Read a single pixel
function getPixel(uint8 x, uint8 y) external view returns (uint24 color, address painter, uint32 blockNumber)

// Read many pixels at once
function getPixels(uint8[] x, uint8[] y) external view returns (Pixel[] memory)
```

### Event

```solidity
event Painted(uint8 indexed x, uint8 indexed y, address indexed painter, uint24 color, uint32 blockNumber)
```

---

## Security notes

- `.env.local` is gitignored — never commit it
- The deployer mnemonic is read from `$MNEMONIC` environment variable only
- All `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time — do not put secrets in them
- The VeChain Solo mnemonic in `hardhat.config.ts` is the well-known public test mnemonic, not a real secret

---

## License

MIT
