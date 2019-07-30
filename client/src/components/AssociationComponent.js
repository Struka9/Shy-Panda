import React from 'react';
import { Form, Button, Row, Container, Col, Spinner } from 'react-bootstrap';
import AlertComponent from './AlertComponent';

class AssociationComponent extends React.Component {
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
        contract.events.AssociationAddedLog({ fromBlock: 'latest' }, (err, event) => {
            const { name } = event.returnValues;
            this.setState({
                alert: <AlertComponent variant="success" message={`Association ${name} has been added!`}
                    onClose={() => this.setState({ alert: null })} />
            })
        });
    }

    handleSubmit = async (event) => {
        this.setState({ loading: true })
        const form = event.currentTarget;
        event.preventDefault();

        if (form.checkValidity() === false) {
            event.stopPropagation();
            this.setState({ validated: false });
        } else {
            const { web3, contract, account } = this.state;
            this.setState({ validated: true });

            const address = form.elements.associationAddress.value;
            const name = form.elements.associationName.value;

            contract
                .methods
                .addAssociation(address, name).send({ from: account })
                .on("receipt", (receipt) => {
                    this.setState({ loading: false, validated: false });
                    form.reset();
                })
                .on("error", (error) => {
                    console.error(error);

                    this.setState({
                        loading: false,
                        alert: <AlertComponent variant="danger"
                            message="Transaction failed, make sure you are not using an empty name or an address already taken"
                            onClose={() => this.setState({ alert: null })} />
                    });
                });
        }
    };

    render() {
        const { alert, owner, account, loading } = this.state;

        if (owner != account) {
            console.log(`Owner is ${owner} and current account is ${account}`);
            return <h1>Only the contract owner should be using this page...</h1>
        }

        return (
            <Container>
                <Col>
                    <br />
                    <h2>New Association</h2>
                    <br />
                    <Form noValidate validated={this.state.validated} onSubmit={this.handleSubmit}>
                        <Form.Group controlId="associationName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control required type="text" />
                        </Form.Group>

                        <Form.Group controlId="associationAddress">
                            <Form.Label>Address</Form.Label>
                            <Form.Control required type="text" placeholder="0x123456789..." />
                            <Form.Text className="text-muted">Make sure that the address matches!</Form.Text>
                            <Form.Control.Feedback type="invalid">Please enter a valid Ethereum Address</Form.Control.Feedback>
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

export default AssociationComponent;