import React from 'react';
import { Card, Box, Heading, Form, Button, Field, Input, Textarea } from 'rimble-ui'
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

        this.handleInputChange = this.handleInputChange.bind(this);
    }

    setup = (web3, contract) => {
        if(contract)
        {
            contract.events.PetAddedLog({ fromBlock: 'latest' }, (err, event) => {
                this.setState({
                    alert: <AlertComponent variant="success" message={`A new pet has been added!`}
                        onClose={() => this.setState({ alert: null })} />
                })
            });
        }
    }

    handleInputChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;
    
        this.setState({
            [name]: value
        });
    }

    handlePetNameChange(event) {
        this.setState({ petName: this.state.web3.utils.utf8ToHex(event.target.value) });
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
            const { web3, contract, account, files, petName, petBio, petNeeded } = this.state;
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

        return (
            <Card>
                <Box>
                    <Heading.h2>New Pet</Heading.h2>
                    <label style={{ color: 'red' }}>Addresses that have not been added by the contract owner won't be able to submit pets</label>
                    <Form validated={this.state.validated} onSubmit={this.handleSubmit}>
                        <Form.Field label="Name" width={1}>
                            <Form.Input width={1} name="petName" required="true" type="text" onChange={this.handleInputChange} />
                        </Form.Field>

                        <Form.Field label="Bio" width={1}>
                            <Textarea width={1} name="petBio" required="true" rows={5} placeholder="Tell the world a little bit about this case..." onChange={this.handleInputChange} />
                        </Form.Field>

                        <Form.Field label="Ether needed" width={1}>
                            <Form.Input width={1} name="petNeeded" required="true" type="text" onChange={this.handleInputChange} />
                        </Form.Field>

                        <Form.Field label="Pictures" width={1}>
                            <Input width={1} required="true" multiple="true" accept="image/*" type="file" onChange={this.handleFiles} />
                        </Form.Field>

                        <Button width={1} type="submit">
                            <span>{loading ? "Loading..." : "Submit"}</span>
                        </Button>
                    </Form>
                </Box>
                <Box>
                    {alert}
                </Box>
            </Card>
        );
    }
}

export default AddPetComponent;