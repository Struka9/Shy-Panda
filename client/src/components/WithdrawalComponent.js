import React from 'react';

import AlertComponent from './AlertComponent';
import { Container, Card, Button, CardColumns } from 'react-bootstrap';


class WithdrawalComponent extends React.Component {

    constructor(props) {
        super(props);
        const { web3, contract, account } = props;
        this.state = {
            web3,
            contract,
            account,
            alert: null,
            enabled: false
        }

        this.setup()
    }

    setup = async () => {
        const { web3, contract, account } = this.state;
        const amount = await contract.methods.balances(account).call() || 0;
        this.setState({ amount: web3.utils.fromWei(amount.toString(), "ether") });
    }

    handleWithdrawClick = async (event) => {
        event.preventDefault();
        const { contract, account } = this.state;

        contract.methods.withdraw().send({ from: account })
            .on("receipt", (receipt) => {
                this.setState({
                    amount: 0, alert: <AlertComponent variant="success" message={`Your ETH has been transferred!`}
                        onClose={() => this.setState({ alert: null })} />
                })
            })
            .on("error", (error) => {
                this.setState({
                    alert: <AlertComponent variant="danger" message={`No transaction was performed`}
                        onClose={() => this.setState({ alert: null })} />
                })
            });
    }

    render() {
        const { amount, alert, enabled } = this.state;
        return (
            <Container>
                <Card className="text-center">
                    <Card.Header>Withdraw</Card.Header>
                    <Card.Body>
                        <Card.Text>
                            {`You got ${amount} ETH available for withdraw`}
                        </Card.Text>
                        <Button variant="primary" onClick={this.handleWithdrawClick}>Withdraw</Button>
                    </Card.Body>
                </Card>
                <br />
                {alert}
            </Container>
        )
    }
}

export default WithdrawalComponent;