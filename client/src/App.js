import React from 'react';
import { AssociationComponent, AddPetComponent, PetDonationComponent, WithdrawalComponent } from './components';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import './App.css';
import Container from 'react-bootstrap/Container';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button';
import CardColumns from 'react-bootstrap/CardColumns';
import Pagination from 'react-bootstrap/Pagination';

import ShyPanda from "./contracts/ShyPanda.json";
import getWeb3 from "./utils/getWeb3";
import NavLink from 'react-bootstrap/NavLink';
import { Nav } from 'react-bootstrap';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = ShyPanda.networks[networkId];
      console.log(`network id => ${networkId}`)
      const contract = new web3.eth.Contract(
        ShyPanda.abi,
        deployedNetwork && deployedNetwork.address,
      );

      const context = this;
      window.ethereum.on('accountsChanged', function (accounts) {
        console.log(`Accounts have changed => ${accounts}`);
        context.setState({ account: accounts[0].toLowerCase() });
      })

      const owner = await contract.methods.owner().call();
      console.log(owner);
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3,
        account: accounts[0].toLowerCase(),
        contract,
        owner: owner.toLowerCase()
      });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  }

  Links = () => (
    <Nav>
      <NavLink href="/">Make a Good Deed</NavLink>
      <NavLink href="/addPet">New Pet</NavLink>
      <NavLink href="/addAssociation">Add Organization</NavLink>
      <NavLink href="/withdraw">Withdraw</NavLink>
    </Nav>
  )

  render() {
    if (!this.state.web3) {
      return <div>Loading components...</div>
    }

    const { web3, owner, contract, account } = this.state;
    console.log(`Rendering with account ${account}`)
    const petDonationComp = <PetDonationComponent web3={web3} contract={contract} owner={owner} account={account} />
    const associationComp = <AssociationComponent web3={web3} contract={contract} owner={owner} account={account} />;
    const addNewPetComp = <AddPetComponent web3={web3} contract={contract} owner={owner} account={account} />;
    const withdrawalComp = <WithdrawalComponent web3={web3} contract={contract} owner={owner} account={account} />

    return (

      <Router>
        <div>
          <this.Links />
          <Route exact path="/" component={() => petDonationComp} />
          <Route exact path="/addAssociation" component={() => associationComp} />
          <Route exact path="/addPet" component={() => addNewPetComp} />
          <Route exact path="/withdraw" component={() => withdrawalComp} />
        </div>
      </Router>
    )
  }
}

export default App;
