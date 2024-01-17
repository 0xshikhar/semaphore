import { writeFileSync } from "fs"
import { task, types } from "hardhat/config"

task("deploy:semaphore", "Deploy a Semaphore contract")
    .addOptionalParam<boolean>("verifiers", "Verifier contract addresses", undefined, types.json)
    .addOptionalParam<boolean>("poseidon", "Poseidon library address", undefined, types.string)
    .addOptionalParam<boolean>("logs", "Print the logs", true, types.boolean)
    .setAction(
        async (
            { logs, verifiers: verifierAddresses, poseidon: poseidonAddress },
            { ethers, hardhatArguments, defender }
        ): Promise<any> => {
            if (!verifierAddresses) {
                verifierAddresses = []

                for (let i = 0; i < 12; i += 1) {
                    const VerifierFactory = await ethers.getContractFactory(`Verifier${i + 1}`)

                    let verifier

                    if (hardhatArguments.network !== undefined && hardhatArguments.network !== "hardhat") {
                        verifier = await defender.deployContract(VerifierFactory, { salt: process.env.CREATE2_SALT })

                        await verifier.waitForDeployment()
                    } else {
                        verifier = await VerifierFactory.deploy()
                    }

                    verifierAddresses.push(await verifier.getAddress())

                    if (logs) {
                        console.info(`Verifier${i + 1} contract has been deployed to: ${verifierAddresses[i]}`)
                    }
                }
            }

            if (!poseidonAddress) {
                const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3")

                let poseidonT3

                if (hardhatArguments.network !== undefined && hardhatArguments.network !== "hardhat") {
                    poseidonT3 = await defender.deployContract(PoseidonT3Factory, { salt: process.env.CREATE2_SALT })

                    await poseidonT3.waitForDeployment()
                } else {
                    poseidonT3 = await PoseidonT3Factory.deploy()
                }

                poseidonAddress = await poseidonT3.getAddress()

                if (logs) {
                    console.info(`Poseidon library has been deployed to: ${poseidonAddress}`)
                }
            }

            const SemaphoreFactory = await ethers.getContractFactory("Semaphore", {
                libraries: {
                    PoseidonT3: poseidonAddress
                }
            })

            let semaphore

            if (hardhatArguments.network !== undefined && hardhatArguments.network !== "hardhat") {
                semaphore = await defender.deployContract(SemaphoreFactory, verifierAddresses, {
                    salt: process.env.CREATE2_SALT
                })

                await semaphore.waitForDeployment()
            } else {
                semaphore = await SemaphoreFactory.deploy(verifierAddresses)
            }

            const semaphoreAddress = await semaphore.getAddress()

            if (logs) {
                console.info(`Semaphore contract has been deployed to: ${semaphoreAddress}`)
            }

            writeFileSync(
                `./deployed-contracts/${hardhatArguments.network}.json`,
                JSON.stringify(
                    {
                        Verifiers: verifierAddresses,
                        Poseidon: poseidonAddress,
                        Semaphore: semaphoreAddress
                    },
                    null,
                    4
                )
            )

            return {
                semaphore,
                verifierAddresses,
                poseidonAddress
            }
        }
    )
