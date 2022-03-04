import chaiAsPromised from 'chai-as-promised'
import { getConnection } from 'typeorm'
import { expect, use } from 'chai'
import fs from 'fs'

import { TestConnection } from '../../../utils/testConnection'
import { processOrganizationFromCSVRow } from '../../../../src/utils/csv/organization'
import { createEntityFromCsvWithRollBack } from '../../../../src/utils/csv/importEntity'
import { Organization } from '../../../../src/entities/organization'
import { Upload } from '../../../../src/types/upload'
import { UserPermissions } from '../../../../src/permissions/userPermissions'
import { createServer } from '../../../../src/utils/createServer'
import { legacyCsvRowFunctionWrapper, Model } from '../../../../src/model'
import {
    ApolloServerTestClient,
    createTestClient,
} from '../../../utils/createTestClient'
import { createAdminUser } from '../../../utils/testEntities'
import { processUserFromCSVRows } from '../../../../src/utils/csv/user'
import { createOrganization } from '../../../factories/organization.factory'
import { createSchool } from '../../../factories/school.factory'
import { createClass } from '../../../factories/class.factory'
import { Role } from '../../../../src/entities/role'
import { createUser, createUsers } from '../../../factories/user.factory'
import { createOrganizationMembership } from '../../../factories/organizationMembership.factory'
import { User } from '../../../../src/entities/user'
import { userToPayload } from '../../../utils/operations/userOps'

use(chaiAsPromised)

describe('createEntityFromCsvWithRollBack', () => {
    let connection: TestConnection
    let file: Upload
    let organizationCount: number
    let adminPermissions: UserPermissions
    let testClient: ApolloServerTestClient

    before(async () => {
        connection = getConnection() as TestConnection
        const server = await createServer(new Model(connection))
        testClient = await createTestClient(server)
    })

    beforeEach(async () => {
        const adminUser = await createAdminUser(testClient)
        adminPermissions = new UserPermissions({
            id: adminUser.user_id,
            email: adminUser.email || '',
        })
    })

    context('when file to process has errors', () => {
        const fileName = 'example.csv'
        const fileStream = fs.createReadStream(
            `tests/fixtures/${fileName}`,
            'utf-8'
        )

        beforeEach(async () => {
            file = {
                filename: fileName,
                mimetype: 'text/csv',
                encoding: '7bit',
                createReadStream: () => fileStream,
            }
        })

        it('does not create any entities', async () => {
            await expect(
                createEntityFromCsvWithRollBack(
                    connection,
                    file,
                    [
                        (
                            manager,
                            rows,
                            rowNumber,
                            fileErrors,
                            userPermissions,
                            queryResultCache
                        ) =>
                            legacyCsvRowFunctionWrapper(
                                manager,
                                rows,
                                rowNumber,
                                fileErrors,
                                userPermissions,
                                queryResultCache,
                                processOrganizationFromCSVRow
                            ),
                    ],
                    adminPermissions,
                    undefined
                )
            ).to.be.rejected

            organizationCount = await connection.manager
                .getRepository(Organization)
                .count()
            expect(organizationCount).eq(0)
        })
    })

    context('when file to process is valid', () => {
        const fileName = 'organizationsExample.csv'
        const fileStream = fs.createReadStream(
            `tests/fixtures/${fileName}`,
            'utf-8'
        )

        beforeEach(async () => {
            file = {
                filename: fileName,
                mimetype: 'text/csv',
                encoding: '7bit',
                createReadStream: () => fileStream,
            }
        })

        it('creates all the expected entities', async () => {
            await createEntityFromCsvWithRollBack(
                connection,
                file,
                [
                    (
                        manager,
                        rows,
                        rowNumber,
                        fileErrors,
                        userPermissions,
                        queryResultCache
                    ) =>
                        legacyCsvRowFunctionWrapper(
                            manager,
                            rows,
                            rowNumber,
                            fileErrors,
                            userPermissions,
                            queryResultCache,
                            processOrganizationFromCSVRow
                        ),
                ],
                adminPermissions,
                undefined
            )
            organizationCount = await connection.manager
                .getRepository(Organization)
                .count()
            expect(organizationCount).gt(0)
        })
    })

    context('when dry run', () => {
        const fileName = 'organizationsExample.csv'
        const fileStream = fs.createReadStream(
            `tests/fixtures/${fileName}`,
            'utf-8'
        )
        const isDryRun = true

        beforeEach(async () => {
            file = {
                filename: fileName,
                mimetype: 'text/csv',
                encoding: '7bit',
                createReadStream: () => fileStream,
            }
        })

        it('no entities are created', async () => {
            await createEntityFromCsvWithRollBack(
                connection,
                file,
                [
                    (
                        manager,
                        rows,
                        rowNumber,
                        fileErrors,
                        userPermissions,
                        queryResultCache
                    ) =>
                        legacyCsvRowFunctionWrapper(
                            manager,
                            rows,
                            rowNumber,
                            fileErrors,
                            userPermissions,
                            queryResultCache,
                            processOrganizationFromCSVRow
                        ),
                ],
                adminPermissions,
                undefined,
                isDryRun
            )
            organizationCount = await connection.manager
                .getRepository(Organization)
                .count()
            expect(organizationCount).eq(0)
        })
    })

    context.only('perf', () => {
        const fileName = 'usersPerfExample.csv'
        let fileStream: fs.ReadStream
        let uploader: User

        for (let i = 0; i < 1; i++) {
            beforeEach(async () => {
                fileStream = fs.createReadStream(
                    `tests/fixtures/${fileName}`,
                    'utf-8'
                )

                file = {
                    filename: fileName,
                    mimetype: 'text/csv',
                    encoding: '7bit',
                    createReadStream: () => fileStream,
                }

                const organization = createOrganization()
                organization.organization_name = 'Chrysalis Digital'
                await organization.save()
                const school = await createSchool(
                    organization,
                    'Chrysalis Golden Ticket'
                ).save()
                await createClass(
                    [school],
                    organization,
                    {},
                    'Golden Ticket Class'
                ).save()
                const teacher = await connection
                    .createEntityManager()
                    .findOne(Role, { where: { role_name: 'Teacher' } })
                const student = await connection
                    .createEntityManager()
                    .findOne(Role, { where: { role_name: 'Student' } })
                const orgAdmin = await connection
                    .createEntityManager()
                    .findOne(Role, {
                        where: { role_name: 'Organization Admin' },
                    })
                uploader = await createUser().save()
                await createOrganizationMembership({
                    user: uploader,
                    organization,
                    roles: [orgAdmin!],
                }).save()
                const user = createUsers(1000)
                await connection.manager.save(user)
                await connection.manager.save(
                    user.map((u) =>
                        createOrganizationMembership({
                            user: u,
                            organization,
                            roles: [teacher!, student!],
                        })
                    )
                )

                for (let i = 0; i < 10; i++) {
                    // other org we dont care about
                    const organization2 = await createOrganization().save()
                    const user2 = createUsers(100)
                    await connection.manager.save(user2)
                    await connection.manager.save(
                        user2.map((u) =>
                            createOrganizationMembership({
                                user: u,
                                organization: organization2,
                            })
                        )
                    )
                }
            })

            it(`test ${i}`, async () => {
                connection.logger.reset()
                console.log('in test')
                console.time('csv time')
                await createEntityFromCsvWithRollBack(
                    connection,
                    file,
                    [processUserFromCSVRows],
                    new UserPermissions(userToPayload(uploader)),
                    undefined
                )
                console.timeEnd('csv time')
                console.log('not in test')
                fs.writeFileSync('./poop', connection.logger.dumpStats)
            })
        }
    })
})
