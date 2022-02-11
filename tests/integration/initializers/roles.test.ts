import { getConnection } from 'typeorm'
import { expect } from 'chai'

import {
    ApolloServerTestClient,
    createTestClient,
} from '../../utils/createTestClient'
import { createOrganizationAndValidate } from '../../utils/operations/userOps'
import { TestConnection } from '../../utils/testConnection'
import { createServer } from '../../../src/utils/createServer'
import { createAdminUser } from '../../utils/testEntities'
import { Model } from '../../../src/model'
import { Organization } from '../../../src/entities/organization'
import RoleInitializer from '../../../src/initializers/roles'
import { Permission } from '../../../src/entities/permission'
import { permissionInfo } from '../../../src/permissions/permissionInfo'

describe('RolesInitializer', () => {
    let connection: TestConnection
    let testClient: ApolloServerTestClient

    before(async () => {
        connection = getConnection() as TestConnection
        const server = await createServer(new Model(connection))
        testClient = await createTestClient(server)
    })

    it('adds all permissions from permissionInfo.csv', async () => {
        await RoleInitializer.run()

        const filePermissions = await permissionInfo()
        const dbPermissions = await Permission.find()

        expect(dbPermissions.length).to.equal(filePermissions.size)
        expect(
            dbPermissions.map((p) => p.permission_name)
        ).to.have.same.members(Array.from(filePermissions.keys()))
    })

    describe('run', () => {
        const roleInfoFunc = function (role: any) {
            return { role_id: role.role_id, role_name: role.role_name }
        }
        const permissionInfoFunc = function (permission: any) {
            return { permission_name: permission.permission_name }
        }

        context('when updated default permissions exists', () => {
            let organization: Organization

            beforeEach(async () => {
                const user = await createAdminUser(testClient)
                organization = await createOrganizationAndValidate(
                    testClient,
                    user.user_id
                )
            })

            it('does not modify the default roles permissions', async () => {
                const { mutate } = testClient
                const dbRoles = await organization.roles()
                const dbPermissions = []
                expect(dbRoles).not.to.be.empty

                for (const role of dbRoles) {
                    const permissions = (await role.permissions) || []

                    expect(permissions).not.to.be.empty
                    dbPermissions.push(...permissions.map(permissionInfoFunc))
                }

                await RoleInitializer.run()

                organization = await Organization.findOneOrFail(
                    organization.organization_id
                )
                const dbNewRoles = await organization.roles()
                expect(dbNewRoles).not.to.be.empty

                expect(dbRoles.map(roleInfoFunc)).to.deep.equal(
                    dbNewRoles?.map(roleInfoFunc)
                )
                const resetPermissions = []

                for (const role of dbNewRoles) {
                    const permissions = (await role.permissions) || []

                    expect(permissions).not.to.be.empty
                    resetPermissions.push(
                        ...permissions?.map(permissionInfoFunc)
                    )
                }

                expect(dbPermissions).to.deep.members(resetPermissions)
            })
        })
    })
})
