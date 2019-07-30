const ShyPanda = artifacts.require("ShyPanda");
let catchRevert = require("./exceptionsHelpers.js").catchRevert

const chai = require('chai');
const BN = require("bn.js");

contract("ShyPanda", async (accounts) => {
    let instance;
    let owner;
    let associationAddress;
    let associationAddress2;
    let donorAddress;
    const petsPerPage = 10;

    before(function () {
        owner = accounts[0];
        associationAddress = accounts[1];
        associationAddress2 = accounts[3];
        donorAddress = accounts[2];
    });

    describe("modifiers", async () => {
        beforeEach(async function () {
            instance = await ShyPanda.new({ from: owner });
        });

        it("should not allow pet if it's not an association", async () => {
            await catchRevert(instance.addPet("Niki", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("1", "ether"),
                { from: donorAddress }));
        });

        it("should not an association change data from other association's pet", async () => {
            // Add both organizations
            const result = await instance.addAssociation(associationAddress, "humans 4 animals", { from: owner });
            await instance.addAssociation(associationAddress2, "Good Deeds", { from: owner });

            // First Organization adds a pet
            await instance.addPet("Niki", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("3", "ether"),
                { from: associationAddress });

            // Second Organization tries to update its name
            await catchRevert(instance.updatePetName(0, "Coco", { from: associationAddress2 }));
        });
    });

    describe("addAssociation", async () => {
        beforeEach(async function () {
            instance = await ShyPanda.new({ from: owner });
        });

        it("should not allow other than the contract owner to add an association", async () => {
            await catchRevert(instance.addAssociation(associationAddress, "humans 4 animals", { from: donorAddress }))
        });

        it("should not allow add an association with no name", async () => {
            await catchRevert(instance.addAssociation(associationAddress, "", { from: owner }))
        });

        it("should not allow add an association more than once", async () => {
            await instance.addAssociation(associationAddress, "humans 4 animals", { from: owner });
            await catchRevert(instance.addAssociation(associationAddress, "humans 4 animals 2", { from: owner }));
        });
    });

    describe("donate", async () => {
        let association;

        beforeEach(async function () {
            instance = await ShyPanda.new({ from: owner });
            association = await instance.addAssociation(associationAddress, "humans 4 animals", { from: owner });
        });

        it("should not allow to donate for unexistent pet", async () => {
            await catchRevert(instance.donate(web3.utils.toBN(1), { value: web3.utils.toWei("0.01", "ether") }))
        });

        it("should increase 'donated' value for pet on donation", async () => {
            const valueSent = web3.utils.toWei("0.5", "ether");

            await instance.addPet("Niki", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("3", "ether"),
                { from: associationAddress });
            await instance.donate(web3.utils.toBN(0),
                { from: donorAddress, value: valueSent });
            const pet = await instance.pets(web3.utils.toBN(0));
            expect(pet.donated.toString()).to.be.equal(valueSent.toString());
        });
    });

    describe("withdraw", async () => {
        let association;
        let pet;
        const valueSent = web3.utils.toWei("1", "ether");

        beforeEach(async function () {
            instance = await ShyPanda.new({ from: owner });
            association = await instance.addAssociation(associationAddress, "humans 4 animals", { from: owner });
            await instance.addPet("Niki", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("3", "ether"),
                { from: associationAddress });
            await instance.donate(web3.utils.toBN(0),
                { from: donorAddress, value: valueSent });
            pet = await instance.pets(web3.utils.toBN(0));
        });

        it("should send money on withdraw and set balance to 0", async () => {
            const balance = await instance.balances.call(associationAddress);
            await instance.withdraw({ from: associationAddress });
            const afterWithdraw = await instance.balances.call(associationAddress);
            expect(balance.toString()).to.be.equal(valueSent.toString());
            expect(afterWithdraw.toString()).to.be.equal(new BN(0).toString());
        });

        it("should not allow address which is not association withdraw money", async () => {
            await catchRevert(instance.withdraw({ from: donorAddress }))
        });
    });

    describe("addPet", async () => {
        let instance;
        let association;

        beforeEach(async function () {
            instance = await ShyPanda.new({ from: owner });
            association = await instance.addAssociation(associationAddress, "humans 4 animals", { from: owner });
        });

        it("should not allow to add a pet with no name", async () => {
            await catchRevert(instance.addPet("", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("3", "ether"),
                { from: associationAddress }))
        });

        it("should not allow to add a pet with a bio that is too short", async () => {
            await catchRevert(instance.addPet("Niki", ["hash1", "hash2"],
                "", web3.utils.toWei("3", "ether"),
                { from: associationAddress }))
        });

        it("should add the pet under the right association", async () => {
            const tx = await instance.addPet("Niki", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("3", "ether"),
                { from: associationAddress });
            const petId = tx.logs[0].args[0];
            const pet = await instance.pets.call(0);
            expect(pet.association).to.be.equal(associationAddress);
        });

        it("should add the pet to the pets by association array", async () => {
            const tx = await instance.addPet("Niki", ["hash1", "hash2"],
                "Some short bio", web3.utils.toWei("3", "ether"),
                { from: associationAddress });
            const petId = tx.logs[0].args[0];
            const petsForAssociation = await instance.petsByAssociation.call(associationAddress, 0);

            expect(petId.toString()).to.be.equal(petsForAssociation.toString());
        });

        it("Should return an empty resultset when invalid page number is passed", async () => {
            const result = await instance.getPetsPage.call(web3.utils.toBN("-1"), { from: donorAddress });
            expect(result[0].length).to.be.equal(0);
        })

        it("Should return the proper number of pages", async () => {
            for (let i = 0; i < petsPerPage + 2; i++) {
                // Let's add a pet
                const tx = await instance.addPet(`Pet${i}`, ["hash1", "hash2"],
                    "Some short bio", web3.utils.toWei(`${i + 1}`, "ether"),
                    { from: associationAddress });
            }

            const pages = await instance.getPageNumber.call({ from: donorAddress });
            expect(pages.toString()).to.be.equal(new BN("2").toString());
        })

        it("Should return the right page when requested", async () => {
            for (let i = 0; i < petsPerPage + 2; i++) {
                // Let's add a pet
                const tx = await instance.addPet(`Pet${i}`, ["hash1", "hash2"],
                    "Some short bio", web3.utils.toWei(`${i + 1}`, "ether"),
                    { from: associationAddress });
            }

            const page0 = await instance.getPetsPage.call(web3.utils.toBN(0), { from: donorAddress });
            const page1 = await instance.getPetsPage.call(web3.utils.toBN(1), { from: donorAddress });

            expect(page0[0].length).to.be.equal(petsPerPage);
            expect(page1[1].length).to.be.equal(2);
        })
    });
});