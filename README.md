# Keep3rV2 Oracle Job

## Objective

Having a template of a keep3r job that could be deployed into keep3r network that will allow updating custom pairs in Keep3rV2Oracle.

## Requirements

In order to use this repo you must copy the `.env.example` file and fill the parameters correctly.

```bash
cp .env.example .env
```

## Contracts

### Keep3rV2 Oracle Job

It will store what pairs should be updated (via addPairs, removePair), and also keep3r requirements for workers if needed (minBond, age, onlyEOA, reward multipliers).

## Deployment

For the job to be able to work Keep3rOracleV2, it should bond and be activated in the keep3r network. Bonding will start as soon as the contract is deployed, but it should be activated 3 days after bonding.

1. Deploy Keep3rV2 Oracle Job

```bash
npm run deploy:job
```

2. Wait for 3 days so you can activate your job in the keep3r network

3. Activate

```bash
npm run job:activate
```

4. Register the following keep3r official [docs](https://github.com/keep3r-network/keep3r.network/#registering-a-job)

## Scripts

### Add Pairs

```bash
npm run job:add-pairs
```

### Remove Pair

```bash
npm run job:remove-pair
```

### Force Work

```bash
npm run job:force-work
```
