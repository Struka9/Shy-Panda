# Avoiding Common Attacks

### Reentrancy Attacks
In the project’s contract there is a function that allows the organizations to withdraw the ether donors have sent. 
```
		/// @notice Allows organizations to withdraw their balance stored in the contract*
    function withdraw() external onlyAssociation {
        uint balance = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(balance);
    }
```

We avoid reentrancy attacks by:
1. Using transfer function instead of `msg.sender.call.value(balance)()`
2. Making sure the internal state has been properly updated before the transfer

### Integer Overflow/Underflow
The contracts make heavy use of integers so protecting against this kind of attack is important.
The measure I took to this in the project is making use of the highly trusted `SafeMath` library from OpenZeppelin. It will wrap the solidity arithmetic for uint reverting on overflows.

`npm install openzeppelin-solidity`

In addition to the aforementioned attack vectors I also took into consideration DoS (Denial of Service) attacks when designing the `withdraw` function, favoring pull over push payments, so it’s not vulnerable to an attacker reverting the payment every time, effectively denying the payment to other organizations.