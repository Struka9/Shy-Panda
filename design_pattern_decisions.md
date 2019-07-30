# Design Patterns Decisions
### Ownership
The main contract of the project is protected by the Ownable pattern, there are functions that have restricted access for the owner of the contract. Since adding an organization is the kickstart of the the whole process we don’t want spam organizations to be able to submit fake cases. In the future this can be replaced with a more robust and decentralized method.

### Withdrawal
When the organization is ready to withdraw the funds they have raised they use the withdraw function in contrast to having a push payment method, I opted for a pull payment method in order to make sure DoS attacks that block the whole payment system can be performed.

### Circuit Breaker
An additional layer of security was added, functions that handle submissions to the contract (like addPet or donate) are protected by a circuit breaker, it can be toggled by the contract owner only and will stop the functions from execution in case of an emergency.