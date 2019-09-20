import React from 'react';

import AlertComponent from './AlertComponent';
import { Card, Heading, Text, Button } from 'rimble-ui'

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
        if(contract)
        {
            const amount = await contract.methods.balances(account).call() || 0;
            this.setState({ amount: web3.utils.fromWei(amount.toString(), "ether") });
        }
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
            <Card>
                <Heading.h2>Withdraw</Heading.h2>
                <Text>
                    {`You got ${amount} ETH available for withdraw`}
                </Text>
                <Button variant="primary" onClick={this.handleWithdrawClick}>Withdraw</Button>
                <br />
                {alert}
            </Card>
        )
    }
}

export default WithdrawalComponent;