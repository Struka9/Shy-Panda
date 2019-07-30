pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

/** 
* @title A contract to gather funds for Pets associations in developing countries.
* @author Oscar Rene Flores Presidente
*/ 
contract ShyPanda is Ownable {
    using SafeMath for uint;

    uint8 private PETS_PER_PAGE = 10;

    event DonationLog(uint _petId, address _from, uint _amount);
    event PetAddedLog(uint _petId);
    event AssociationAddedLog(address _address, string name);
    event PetUpdatedLog(uint _petId);

    /**
    * @title A struct representing each of the pets 
    * @dev needed and donated represent how much this pet needs and how much it has been donated, respectively 
    */
    struct Pet {
        string name;
        string[] photos;
        string bio;
        bool isActive;
        uint needed;
        uint donated;
        address association;
    }

    // The balances of the associations
    mapping(address => uint) public balances;

    // These are our registered associations
    mapping(address => string) public associations;

    // All the pets
    Pet[] public pets;

    // Quick way to access pets by association
    mapping(address => uint[]) public petsByAssociation;

    // The circuit breaker flag
    bool stopped;

    /// Don't allow execution in case there is an emergency!
    modifier stopIfEmergency() {
        require(!stopped);
        _;
    }

    /// Only allow execution in case of an emergency
    modifier onlyIfEmergency() {
        require(stopped);
        _;
    }

    /// Only allow an address added as association...
    modifier onlyAssociation() {
        require(bytes(associations[msg.sender]).length != 0);
        _;
    }

    /// Only allow the organization who originally submitted this pet...    
    modifier onlyAssociationWithPet(uint _petId) {
        require(_petId >= 0 && _petId < pets.length);
        require(pets[_petId].association == msg.sender);
        _;
    }

    /// @notice Toggles the circuit breaker to stop the contract from working in case of emergency
    function toggleCircuitBreaker() onlyOwner public {
        stopped = !stopped;
    }

    /// @notice Adds a new organization to the contract, addresses added as organizations will be allowed to submit pets and withdraw money.
    /// @dev _name must not be empty and the address must not have been previously added as organization
    /// @param _address The address to add as organization
    /// @param _name The name of this organization
    function addAssociation(address _address, string calldata _name) external onlyOwner {
        require(bytes(_name).length != 0);
        // We need to know that this address is not in use
        require(bytes(associations[_address]).length == 0, "This association already exists");

        associations[_address] = _name;
        balances[_address] = 0;

        emit AssociationAddedLog(_address, _name);
    }

    /// @notice Payable function that receives money for a given pet
    /// @dev The value sent to this function will increase the balances for the organization in charge
    /// @param _petId The id of the pet to which we would like to donate
    function donate(uint _petId) external payable stopIfEmergency {
        require(_petId >= 0 && _petId < pets.length);
        Pet storage pet = pets[_petId];
        pet.donated = pet.donated.add(msg.value);
        balances[pet.association] = balances[pet.association].add(msg.value);

        emit DonationLog(_petId, pet.association, msg.value);
    }

    /// @notice Allows organizations to withdraw their balance stored in the contract
    function withdraw() external onlyAssociation stopIfEmergency {
        uint balance = balances[msg.sender];
        balances[msg.sender] = 0;
        msg.sender.transfer(balance);
    }

    /// @notice Adds a new pet to the contract
    /// @dev This pet will be linked to the association's address that originally called the function
    /// @param _name The name of the pet
    /// @param _photos An array of photo pointers, a pointer is a hash that refer to a file stored in IPFS
    /// @param _bio A short bio for this
    /// @param _needed How much Ether this pet will need to pay for their recovery, expressed in Ether
    function addPet(string memory _name, string[] memory _photos, string memory _bio, uint _needed) 
    public 
    onlyAssociation
    stopIfEmergency 
    returns (uint) {
        require(bytes(_name).length != 0);
        require(bytes(_bio).length >= 10);
        Pet memory pet = Pet({
            name: _name,
            photos: _photos,
            bio: _bio,
            association: msg.sender,
            needed: _needed.mul(1 ether),
            donated: 0,
            isActive: true
        });

        uint id = pets.push(pet);
        uint[] storage associationPets = petsByAssociation[msg.sender];
        associationPets.push(id);
        petsByAssociation[msg.sender] = associationPets;

        emit PetAddedLog(id);
        return id;
    }

    /// @notice Returns the number of pages that can be queried effectively
    function getPageNumber() external view returns (uint) {
        uint pages = pets.length.div(PETS_PER_PAGE);
        return pages + (pets.length.mod(PETS_PER_PAGE) != 0 ? 1 : 0);
    }

    /// @notice Retrieves the pets that belong to a given page, pagination is 1-based
    /// @dev The pages are calculated in reverse order of the way they were added to the contract
    /// @param page The page for which we would like to get the pets
    function getPetsPage(uint page) external view returns(
        uint[] memory petIds,
        string[] memory petNames,
        string[] memory petBios,
        uint[] memory petNeeded,
        uint[] memory petDonated,
        address[] memory associationAddresses,
        string[] memory photos) {
            require(page >= 0, "Page number must be 0 or more");

            if (page * PETS_PER_PAGE >= pets.length) {
                petIds = new uint[](0);
                petNames = new string[](0);
                petBios = new string[](0);
                petNeeded = new uint[](0);
                petDonated = new uint[](0);
                associationAddresses = new address[](0);
                photos = new string[](0);
            } else {
                uint initialId = pets.length.sub(page.mul(PETS_PER_PAGE)).sub(1);
                uint len = PETS_PER_PAGE;

                if (initialId < PETS_PER_PAGE - 1) {
                    len = initialId.add(1);
                }

                petIds = new uint[](len);
                petNames = new string[](len);
                petBios = new string[](len);
                petNeeded = new uint[](len);
                petDonated = new uint[](len);
                associationAddresses = new address[](len);
                photos = new string[](len);

                uint count = 0;

                while (count < len) {
                    Pet memory pet = pets[initialId.sub(count)];
                    petIds[count] = initialId.sub(count);
                    petNames[count] = pet.name;
                    petBios[count] = pet.bio;
                    petNeeded[count] = pet.needed;
                    petDonated[count] = pet.donated;
                    associationAddresses[count] = pet.association;
                    photos[count] = pet.photos[0];
                    count = count.add(1);
                }
            }
    }

    /// @notice Allows an organization to update the pet's name
    /// @param _petId The id of the pet whose name is about to be changed
    /// @param _name The new name of this pet
    function updatePetName(uint _petId, string calldata _name) external stopIfEmergency onlyAssociationWithPet(_petId) {
        require(bytes(_name).length != 0);
        Pet storage pet = pets[_petId];
        pet.name = _name;
        emit PetUpdatedLog(_petId);
    }

    /// @notice Allows an organization to update the pet's bio
    /// @param _petId The id of the pet whose bio is about to be changed
    /// @param _bio The new bio of this pet
    function updatePetBio(uint _petId, string calldata _bio) external stopIfEmergency onlyAssociationWithPet(_petId) {
        require(bytes(_bio).length >= 10);
        Pet storage pet = pets[_petId];
        pet.bio = _bio;
        emit PetUpdatedLog(_petId);
    }

    /// @notice Allows an organization to update whether this pet is still under their care or not
    /// @param _petId The id of the pet
    /// @param _isActive Whether this pet is still under the organization's care or not
    function setPetActive(uint _petId, bool _isActive) external stopIfEmergency onlyAssociationWithPet(_petId) {
        Pet storage pet = pets[_petId];
        pet.isActive = _isActive; 
        emit PetUpdatedLog(_petId);
    }

    /// @notice Allows an organization to add a photo for a pet
    /// @param _petId The id of the pet
    /// @param _hash The hash pointing to an IPFS file
    function addPetPhoto(uint _petId, string calldata _hash) external stopIfEmergency onlyAssociationWithPet(_petId) {
        require(bytes(_hash).length != 0);
        Pet storage pet = pets[_petId];
        pet.photos.push(_hash);

        emit PetUpdatedLog(_petId);
    }

    function() external payable {
        revert("fallback not available");
    }
}