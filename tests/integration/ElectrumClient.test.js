import { DOICHAIN } from "../../blue_modules/network";
const bitcoin = require("bitcoinjs-lib");
const net = require("net");
const tls = require("tls");

const assert = require("assert");
jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;

const hardcodedPeers = [
  { host: "itchy-jellyfish-89.doi.works", ssl: "50002" },
  { host: "pink-deer-69.doi.works", ssl: "50002" },
  { host: "ugly-bird-70", ssl: "50002" },
  { host: "itchy-jellyfish-89.doi.works", tcp: "50002" },
  { host: "pink-deer-69.doi.works", tcp: "50002" },
  { host: "ugly-bird-70", tcp: "50002" },
];

describe("ElectrumClient", () => {
  it("can connect and query", async () => {
    const ElectrumClient = require("electrum-client");

    for (const peer of hardcodedPeers) {
      const mainClient = new ElectrumClient(
        net,
        tls,
        peer.ssl || peer.tcp,
        peer.host,
        peer.ssl ? "tls" : "tcp"
      );

      try {
        await mainClient.connect();
        await mainClient.server_version("2.7.11", "1.4");
      } catch (e) {
        mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
        mainClient.close();
        throw new Error(
          "bad connection: " + JSON.stringify(peer) + " " + e.message
        );
      }

      let addr4elect =
        "bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej";
      let script = bitcoin.address.toOutputScript(addr4elect.DOICHAIN);
      let hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(hash.reverse());
      const start = +new Date();
      let balance = await mainClient.blockchainScripthash_getBalance(
        reversedHash.toString("hex")
      );
      const end = +new Date();
      end - start > 1000 &&
        console.warn(
          peer.host,
          "took",
          (end - start) / 1000,
          "seconds to fetch balance"
        );
      assert.ok(balance.confirmed > 0);

      addr4elect = "3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK";
      script = bitcoin.address.toOutputScript(addr4elect, DOICHAIN);
      hash = bitcoin.crypto.sha256(script);
      reversedHash = Buffer.from(hash.reverse());
      balance = await mainClient.blockchainScripthash_getBalance(
        reversedHash.toString("hex")
      );

      // let peers = await mainClient.serverPeers_subscribe();
      // console.log(peers);
      mainClient.close();
    }
  });
});
