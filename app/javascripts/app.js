// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import redditRegistry_artifacts from '../../build/contracts/RedditRegistry.json'

// RedditRegistry is our usable abstraction, which we'll use through the code below.
var RedditRegistry = contract(redditRegistry_artifacts);

var accounts;
var account;

var proofUrlPrepend = 'https://www.reddit.com/r/ethereumproofs/comments/';
var proofUrlAppend = '.json';

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the RedditRegistry abstraction for use.
    RedditRegistry.setProvider(web3.currentProvider);
    self.refreshAccount();
  },

  refreshAccount: function() {
    var self = this;
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];
      self.refreshRegister(account);
    });
  },

  setRegisterStatus: function(message) {
    var status = document.getElementById("registerStatus");
    status.innerHTML = message;
  },

  setLookupStatus: function(message) {
    var status = document.getElementById("lookupStatus");
    status.innerHTML = message;
  },

  setAddress: function(addr) {
    var addr_element = document.getElementById("addr");
    addr_element.value = addr;
  },

  refreshRegister: function(account) {

    var self = this;
    var redditRegister;

    self.setAddress(account);

    RedditRegistry.deployed().then(function(instance) {
      redditRegister = instance;
      return redditRegister.lookupAddr.call(account, {from: account});
    }).then(function(result) {
      var name_element = document.getElementById("name");
      var proofUrl_element = document.getElementById("proofUrl");
      if (result[0] === "") {
        name_element.innerHTML = "nothing";
        proofUrl_element.innerHTML = "https://";
      } else {
        name_element.innerHTML = result[0];
        proofUrl_element.innerHTML = proofUrlPrepend + result[1] + proofUrlAppend;
      }
    }).then(function() {

      var registerEventBlockNumber = 0;

      var nameAddressProofEvent = redditRegister.NameAddressProofRegistered({_addr: account}, {fromBlock: 0, toBlock: 'latest'});
      nameAddressProofEvent.watch(function(error, result){
        if (result.blockNumber >= registerEventBlockNumber) {
          self.setRegisterStatus(result.event);
          registerEventBlockNumber = result.blockNumber;
        }
        console.log(result.args);
      });

      var addressMismatchEvent = redditRegister.AddressMismatch({_addr: account}, {fromBlock: 0, toBlock: 'latest'});
      addressMismatchEvent.watch(function(error, result){
        if (result.blockNumber >= registerEventBlockNumber) {
          self.setRegisterStatus(result.event);
          registerEventBlockNumber = result.blockNumber;
        }
        console.log(result.args);
      });

      var registrationSentEvent = redditRegister.RegistrationSent({_addr: account}, {fromBlock: 0, toBlock: 'latest'});
      registrationSentEvent.watch(function(error, result){
        if (result.blockNumber >= registerEventBlockNumber) {
          self.setRegisterStatus(result.event);
          registerEventBlockNumber = result.blockNumber;
        }
        console.log(result.args);
      });

      var registrarErrorEvent  = redditRegister.RegistrarError({_addr: account}, {fromBlock: 0, toBlock: 'latest'});
      registrarErrorEvent.watch(function(error, result){
        if (result.blockNumber >= registerEventBlockNumber) {
          self.setRegisterStatus(result.event + ": " + result.args["_message"]);
          registerEventBlockNumber = result.blockNumber;
        }
        console.log(result.args);
      });

    }).catch(function(e) {
      console.log(e);
      self.setRegisterStatus("Error getting reddit name; see log.");
    });

  },

  register: function() {
    var self = this;

    var addr = document.getElementById("addr").value;
    var proof = document.getElementById("proof").value;

    var redditRegister;
    RedditRegistry.deployed().then(function(instance) {
      redditRegister = instance;
      return redditRegister.getCost.call({from: account});
    }).then(function(price) {
      return redditRegister.register(proof, addr, {from: account, value: price.toNumber()});
    }).catch(function(e) {
      console.log(e);
      self.setRegisterStatus("Error registering; see log.");
    });
  },

  lookupAddr: function() {
    var self = this;
    var addr = document.getElementById("lookupAddr").value;
    var redditRegister;
    RedditRegistry.deployed().then(function(instance) {
      redditRegister = instance;
      return redditRegister.lookupAddr.call(addr, {from: account});
    }).then(function(result) {
      var name_element = document.getElementById("lookupName");
      self.updateLookupProofUrl(result[1]);
      name_element.value = result[0];
    }).catch(function(e) {
      console.log(e);
      self.setLookupStatus("Error looking up address; see log.");
    });
  },

  lookupName: function() {
    var self = this;
    var name = document.getElementById("lookupName").value;
    var redditRegister;
    RedditRegistry.deployed().then(function(instance) {
      redditRegister = instance;
      return redditRegister.lookupName.call(name, {from: account});
    }).then(function(result) {
      var addr_element = document.getElementById("lookupAddr");
      self.updateLookupProofUrl(result[1]);
      addr_element.value = result[0];
    }).catch(function(e) {
      console.log(e);
      self.setLookupStatus("Error looking up name; see log.");
    });
  },

  updateLookupProofUrl: function(lookupProofUrl) {
    var url_element = document.getElementById("lookupProofUrl");
    if (lookupProofUrl === "") {
      url_element.value = "https://";
    }
    url_element.value = proofUrlPrepend + lookupProofUrl + proofUrlAppend;
  }

};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  }

  App.start();
});
