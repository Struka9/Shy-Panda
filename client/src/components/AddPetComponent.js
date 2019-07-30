import React from 'react';
import { Form, Button, Row, Container, Col, option, Spinner } from 'react-bootstrap';
import AlertComponent from './AlertComponent';
import Keys from '../keys'

import axios from 'axios';
import FormData from 'form-data';

class AddPetComponent extends React.Component {
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
            loading: false
        };
        this.setup(web3, contract, owner);
    }

    setup = (web3, contract) => {
        contract.events.PetAddedLog({ fromBlock: 'latest' }, (err, event) => {
            this.setState({
                alert: <AlertComponent variant="success" message={`A new pet has been added!`}
                    onClose={() => this.setState({ alert: null })} />
            })
        });
    }

    handleFiles = (event) => {
        event.preventDefault();
        const files = event.currentTarget.files;

        this.setState({
            files,
        });
    }

    uploadFile = async (file) => {
        const pinataAPIKey = Keys.apiKey;
        const pinataSecretApiKey = Keys.secret;
        const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

        let data = new FormData();
        data.append('file', file);

        const response = await axios.post(
            url,
            data,
            {
                maxContentLength: 'Infinity',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                    'pinata_api_key': pinataAPIKey,
                    'pinata_secret_api_key': pinataSecretApiKey
                }
            }
        );

        return response;
    }

    handleSubmit = async (event) => {
        this.setState({ loading: true });
        const form = event.currentTarget;
        event.preventDefault();
        if (form.checkValidity() === false) {
            event.stopPropagation();
        } else {
            const { web3, contract, account, files } = this.state;
            this.setState({ validated: true });

            const responses = [];
            try {
                const len = files.length;
                for (let i = 0; i < len; i++) {
                    const file = files.item(i);
                    responses.push(await this.uploadFile(file));
                }
            } catch (e) {
                console.error(e);
                this.setState({
                    loading: false,
                    alert: <AlertComponent message="Couldn't upload your photos"
                        variant="danger" onClose={() => this.setState({ alert: null })} />
                })
                return;
            }

            const photosHashes = responses.map((r) => r['data']['IpfsHash']);
            const petName = form.elements.petName.value;
            const petBio = form.elements.petBio.value;
            const petNeeded = form.elements.petNeeded.value;


            contract.methods.addPet(petName, photosHashes, petBio, petNeeded).send({ from: account })
                .on("receipt", (receipt) => {
                    this.setState({ loading: false, validated: false });
                    form.reset()
                })
                .on("error", (err) => {
                    console.error(err);
                    this.setState({
                        loading: false,
                        alert: <AlertComponent variant="danger"
                            message="Transaction failed, make sure you are filling all the fields"
                            onClose={() => this.setState({ alert: null })} />
                    });
                });
        }
        this.setState({ validated: true });
    };

    render() {
        const { alert, owner, account, loading: loading } = this.state;

        const etherOptions = [];
        for (let i = 1; i <= 100; i++) {
            etherOptions.push(<option key={i}>{i}</option>);
        }

        return (
            <Container>
                <Col>
                    <br />
                    <h1>New Pet</h1>
                    <label style={{ color: 'red' }}>Addresses that have not been added by the contract owner won't be able to submit pets</label>
                    <br />
                    <Form noValidate validated={this.state.validated} onSubmit={this.handleSubmit}
                    >
                        <Form.Group controlId="petName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control required type="text" />
                        </Form.Group>

                        <Form.Group controlId="petBio">
                            <Form.Label>Bio</Form.Label>
                            <Form.Control required as="textarea" rows="5" placeholder="Tell the world a little bit about this case..." />
                        </Form.Group>

                        <Form.Group controlId="petNeeded">
                            <Form.Label>Ether needed</Form.Label>
                            <Form.Control required as="select">
                                {etherOptions}
                            </Form.Control>
                        </Form.Group>

                        <Form.Group controlId="petPhotos">
                            <Form.Label>Pictures</Form.Label>
                            <Form.Control onChange={this.handleFiles} required multiple type="file" accept="image/*" />
                        </Form.Group>
                        <Button variant="primary" type="Submit" disabled={loading}>
                            {loading ? <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                            /> : null}
                            <span>{loading ? "Loading..." : "Submit"}</span>
                        </Button>
                    </Form>
                </Col>
                <br />
                <Row>
                    <Col>
                        {alert}
                    </Col>
                </Row>
            </Container>
        );
    }
}

export default AddPetComponent;