import React from 'react';
import BigNumber from 'bignumber.js';
import {
    Container,
    Pagination,
    ProgressBar,
    InputGroup,
    FormControl,
    Modal
} from 'react-bootstrap';
import {Box, Card, Heading, Text, Image, Button, Progress} from 'rimble-ui'
import InfiniteScroll from 'react-infinite-scroll-component';

class PetDonationComponent extends React.Component {

    constructor(props) {
        super(props);

        const { web3, contract, owner, account } = props;
        this.state = {
            web3,
            owner,
            contract,
            account,
            validated: false,
            alert: null,
            pageNumber: 0,
            currentPage: 0,
            showDonateModal: false,
            pets: null
        };
        this.setup(web3, contract, owner, account);
    }

    setup = async (web3, contract, owner, account) => {
        if(contract)
        {
            const pageNumber = await contract.methods.getPageNumber.call();
            contract.events.DonationLog({ from: 'latest' }, (err, event) => {
                if (err) {
                    console.error(err);
                    return;
                }
                const { pets } = this.state;
                const petId = event.returnValues['_petId'];
                const amount = event.returnValues['_amount'];
                const petIdx = pets.findIndex((e) => e['id'] === petId);
                
                if (petIdx != -1) {
                    const sum = pets[petIdx]['donated'].plus(amount);
                    pets[petIdx]['donated'] = sum;
                    this.setState({ pets })
                }
            });
            this.setState({ pageNumber }, this.loadPetsNextPage);
        }
    }

    loadPetsNextPage = async () => {
        const { contract, account, pets, currentPage } = this.state;
        contract.methods.getPetsPage(currentPage).call()
            .then((result) => {
                const arr = pets || [];
                const len = result.petNames.length;

                for (let i = 0; i < len; i++) {
                    const pet = {};
                    pet['name'] = result['petNames'][i];
                    pet['bio'] = result['petBios'][i];
                    pet['donated'] = new BigNumber(result['petDonated'][i]);
                    pet['needed'] = new BigNumber(result['petNeeded'][i]);
                    pet['address'] = result['associationAddresses'][i];
                    pet['photo'] = result['photos'][i];
                    pet['id'] = result['petIds'][i];
                    arr.push(pet);
                }

                this.setState({ pets: arr, currentPage: currentPage + 1 });
            })
            .catch((err) => console.error(err));
    }

    render() {
        const { pets, currentPage, pageNumber, showDonateModal, validated, id } = this.state;

        if (!pets) {
            return <h1>Loading pets...</h1>
        }

        const cards = pets.map((e) => this.buildCard(e));

        return (
            <Box>
                <div>
                    <Box>
                        {cards}
                    </Box>

                    <Modal show={showDonateModal} onHide={this.handleModalClose}>
                        <Modal.Header closeButton>
                            <Modal.Title>Make a good deed</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <InputGroup className="mb-3">
                                <FormControl
                                    id="etherAmount"
                                    required
                                    placeholder="5"
                                    onChange={this.handleAmountChange}
                                    type="number"
                                    aria-label="Amount"
                                    aria-describedby="basic-addon1" />
                                <FormControl.Feedback type="invalid">Please enter a valid amount</FormControl.Feedback>
                                <InputGroup.Append>
                                    <InputGroup.Text id="basic-addon1">ETH</InputGroup.Text>
                                </InputGroup.Append>
                            </InputGroup>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={this.handleModalClose}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={this.handleSendEther}>
                                Donate
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </div>
            </Box>
        )
    }

    handleAmountChange = (event) => {
        const etherAmount = event.currentTarget.value;
        this.setState({ etherAmount })
    }

    handleModalClose = (event) => {
        if (event) event.preventDefault();
        this.setState({ showDonateModal: false })
    }

    handleSendEther = async (event) => {
        event.preventDefault();
        const { contract, account, web3, id, etherAmount } = this.state;
        const inWei = web3.utils.toWei(etherAmount || "0", "ether");
        contract
            .methods
            .donate(id)
            .send({ from: account, value: inWei, gas: 3000000 })
            .on("receipt", (receipt) => {
                this.setState({ showDonateModal: false });
            })
            .on("error", (error) => {
                this.setState({ showDonateModal: false });
            })
    }

    handleDonateClick = async (id, event) => {
        event.preventDefault();
        this.setState({ showDonateModal: true, id })
    }

    buildCard = ({ id, name, photo, bio, address, needed, donated }) => {
        const { web3 } = this.state;
        const res = Math.round(donated.dividedBy(needed).times(100).toNumber());
        const progress = Math.min(res, 100);
        return (
            <Card>
                <Heading.h2>{name}</Heading.h2>
                <Image width={1} src={`https://ipfs.io/ipfs/${photo}`} />
                <Heading.h3>{`Goal: ${web3.utils.fromWei(needed.toString(), "ether")} ETH`}</Heading.h3>
                <Text>{progress}%</Text>
                <Progress value={progress} />
                <Text>
                    {bio}
                </Text>
                <Button width={1} onClick={this.handleDonateClick.bind(this, id)}>Donate</Button>
            </Card>
        );
    }

    buildPagination = (pages) => {
        const items = [];
        for (let number = 1; number <= pages; number++) {
            items.push(
                <Pagination.Item key={number} active={false}>
                    {number}
                </Pagination.Item>,
            )
        }

        return (<div>
            <Pagination>{items}</Pagination>
            <br />
        </div>);
    }
}

export default PetDonationComponent;