# Keep3rV1 Oracle Job

## Objective

Having a template of a job that could be deployed into the keep3r network that will allow updating pairs in Keep3rV1Oracle.

## Contracts

### Oracle Bonded Keep3r

If any special requirements are set up for keep3r worker's this contract will be used as a proxy to comply with those requirements. Also it will manage what keep3r v1 oracle jobs can use it as a proxy via the allowed list. &nbsp;

### Customizable Keep3rV1 Oracle Job

It will be the one who storage what pairs should be updated (via addPairs, removePair), and also modify keep3r requirements (minBond, age, onlyEOA, reward multipliers).

### Restricted Keep3rV1 Oracle Job

Like a customizable but it will fix the keep3r requirements. This will allow you to use Yean's oracle bonded keep3r.

## Scripts

### Deploy restricted

1. Deploy Restricted Keep3rV1 Oracle Job

```bash
npm run deploy:restricted
```

2. Send Luciano the address of the deployed contract

### Deploy customizable

1. Deploy Oracle Bonded Keeper

```bash
npm run deploy:bonded
```

2. Save the address in utils/contracts.ts under `mainnet.owned.oracleBondedKeeper`
3. Deploy Customizable Keep3rV1 Oracle Job

```bash
npm run deploy:customizable
```

4. Add Customizable Keep3rV1 Oracle Job to allowed jobs in Oracle Bonded Keep3r

```bash
npm run bonded:add-job
```

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
