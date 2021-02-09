import { expect } from "chai";
import { Connection } from "typeorm";
import { Model } from "../../src/model";
import { createServer } from "../../src/utils/createServer";
import { ApolloServerTestClient, createTestClient } from "../utils/createTestClient";
import { addRoleToOrganizationMembership } from "../utils/operations/organizationMembershipOps";
import { addUserToOrganizationAndValidate, createRole } from "../utils/operations/organizationOps";
import { createOrganizationAndValidate } from "../utils/operations/userOps";
import { createTestConnection } from "../utils/testConnection";
import { createUserBilly, createUserJoe } from "../utils/testEntities";
import { PermissionName } from "../../src/permissions/permissionNames";
import { UserPermissions } from "../../src/permissions/userPermissions";
import { createDefaultRoles } from "../utils/operations/modelOps";
import { denyPermission, editPermissions, getPermissionViaRole, grantPermission, revokePermission, updateRole, deleteRole } from "../utils/operations/roleOps";
import { BillyAuthToken, JoeAuthToken } from "../utils/testConfig";
import { Permission } from "../../src/entities/permission";
import { Role } from "../../src/entities/role";
import { Status } from "../../src/entities/status";
import chaiAsPromised from "chai-as-promised";
import chai from "chai"
chai.use(chaiAsPromised);

describe("role", () => {
    let connection: Connection;
    let testClient: ApolloServerTestClient;
    let originalAdmins: string[];

    before(async () => {
        originalAdmins = UserPermissions.ADMIN_EMAILS
        UserPermissions.ADMIN_EMAILS = ['joe@gmail.com']
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    after(async () => {
        UserPermissions.ADMIN_EMAILS = originalAdmins
        await connection?.close();
    });

    beforeEach(async () => {
        await connection.synchronize(true);
        await createDefaultRoles(testClient, { authorization: JoeAuthToken });
    });

    describe("set", () => {
        const originalRoleName = "Original Role Name";
        const newRoleName = "New Role Name";
        const roleDescription = "Some description";
        let organizationId: string;
        let userId: string;
        let roleId: string;

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            userId = (await createUserBilly(testClient)).user_id;
            organizationId = (await createOrganizationAndValidate(testClient, orgOwner.user_id, "org 1")).organization_id;
            await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: JoeAuthToken });
        });

        context("when is a system role", () => {
            beforeEach(async () => {
                roleId = (await createRole(testClient, organizationId, originalRoleName)).role_id;
                await updateRole(testClient, { roleId, systemRole: true }, { authorization: JoeAuthToken });

                await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
                await grantPermission(testClient, roleId, PermissionName.edit_groups_30330, { authorization: JoeAuthToken });
            });

            context("and the user is an admin", () => {
                it("updates the role", async () => {
                    const gqlRole = await updateRole(testClient, { roleId, roleName: newRoleName, roleDescription }, { authorization: JoeAuthToken });

                    const dbRole = await Role.findOneOrFail({ where: { role_id: roleId } });
                    expect(gqlRole).to.exist;
                    expect(gqlRole).to.include({ role_id: roleId, role_name: newRoleName, role_description: roleDescription });
                    expect(dbRole).to.include(gqlRole);
                });
            });

            context("and the user is not an admin", () => {
                it("raises a permission exception", async () => {
                    const fn = () => updateRole(testClient, { roleId, newRoleName, roleDescription }, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;

                    const dbRole = await Role.findOneOrFail({ where: { role_id: roleId } });
                    expect(dbRole.role_name).to.equal(originalRoleName);
                    expect(dbRole.system_role).to.be.true
                });
            });
        });

        context("when is not a system role", () => {
            beforeEach(async () => {
                roleId = (await createRole(testClient, organizationId, originalRoleName)).role_id;
                await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
            });

            context("and the user has the 'edit groups' permission within the organization", () => {
                beforeEach(async () => {
                    await grantPermission(testClient, roleId, PermissionName.edit_groups_30330, { authorization: JoeAuthToken });
                });

                it("should return the modified role and update the database entry", async () => {
                    const gqlRole = await updateRole(testClient, { roleId, roleName: newRoleName, roleDescription }, { authorization: BillyAuthToken });

                    const dbRole = await Role.findOneOrFail({ where: { role_id: roleId } });
                    expect(gqlRole).to.exist;
                    expect(gqlRole).to.include({ role_id: roleId, role_name: newRoleName, role_description: roleDescription });
                    expect(dbRole).to.include(gqlRole);
                });
            });

            context("and the user does not have the 'edit groups' permission within the organization", () => {
                it("should throw a permission exception, and not update the database entry", async () => {
                    const fn = () => updateRole(testClient, { roleId, newRoleName, roleDescription }, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;

                    const dbRole = await Role.findOneOrFail({ where: { role_id: roleId } });
                    expect(dbRole.role_name).to.equal(originalRoleName);
                });
            });
        });
    });

    describe("permission", () => {
        const nameOfPermissionToGet = PermissionName.create_school_20220;
        let organizationId: string;
        let userId: string;
        let roleId: string;

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            userId = (await createUserBilly(testClient)).user_id;
            organizationId = (await createOrganizationAndValidate(testClient, orgOwner.user_id, "org 1")).organization_id;
            await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: JoeAuthToken });
            roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
            await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
            await grantPermission(testClient, roleId, nameOfPermissionToGet, { authorization: JoeAuthToken });
        });

        context("when is a system role", () => {
            beforeEach(async () => {
                await updateRole(testClient, { roleId, systemRole: true }, { authorization: JoeAuthToken });
            });

            context("when user has the 'view role permissions' permission within the organization", () => {
                beforeEach(async () => {
                    await grantPermission(testClient, roleId, PermissionName.view_role_permissions_30112, { authorization: JoeAuthToken });
                });

                it("should return the permission", async () => {
                    const gqlPermission = await getPermissionViaRole(testClient, roleId, nameOfPermissionToGet, { authorization: BillyAuthToken });

                    expect(gqlPermission).to.exist;
                    expect(gqlPermission).to.include({ role_id: roleId, permission_name: nameOfPermissionToGet });
                });
            });

            context("when user does not have the 'view role permissions' permission within the organization", () => {
                it("should throw a permission exception", async () => {
                    const fn = () => getPermissionViaRole(testClient, roleId, nameOfPermissionToGet, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;
                });
            });
        });

        context("when is not a system role", () => {
            context("when user has the 'view role permissions' permission within the organization", () => {
                beforeEach(async () => {
                    await grantPermission(testClient, roleId, PermissionName.view_role_permissions_30112, { authorization: JoeAuthToken });
                });

                it("should return the permission", async () => {
                    const gqlPermission = await getPermissionViaRole(testClient, roleId, nameOfPermissionToGet, { authorization: BillyAuthToken });

                    expect(gqlPermission).to.exist;
                    expect(gqlPermission).to.include({ role_id: roleId, permission_name: nameOfPermissionToGet });
                });
            });

            context("when user does not have the 'view role permissions' permission within the organization", () => {
                it("should throw a permission exception", async () => {
                    const fn = () => getPermissionViaRole(testClient, roleId, nameOfPermissionToGet, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;
                });
            });
        });
    });

    describe("grant", () => {
        const nameOfPermissionToGrant = PermissionName.edit_groups_30330;
        let organizationId: string;
        let userId: string;
        let roleId: string;

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            userId = (await createUserBilly(testClient)).user_id;
            organizationId = (await createOrganizationAndValidate(testClient, orgOwner.user_id, "org 1")).organization_id;
            await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: JoeAuthToken });
            roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
            await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
        });

        context("when is a system role", () => {
            beforeEach(async () => {
                await updateRole(testClient, { roleId, systemRole: true }, { authorization: JoeAuthToken });
            });

            context("and the user is not an admin", () => {
                it("raises a permission exception", async () => {
                    const fn = () => grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;

                    const dbPermission = await Permission.findOne({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                    expect(dbPermission).to.be.undefined;
                });
            });

            context("and the user is an admin", () => {
                context("when user has the 'edit role permissions' permission within the organization", () => {
                    beforeEach(async () => {
                        await grantPermission(testClient, roleId, PermissionName.edit_role_permissions_30332, { authorization: JoeAuthToken });
                    });

                    context("and permission entry exists with allow set to false", () => {
                        beforeEach(async () => {
                            await denyPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });
                        });

                        it("should return the permission with 'allow' set to true and update the database entry", async () => {
                            const gqlPermission = await grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });

                            const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                            expect(gqlPermission).to.exist;
                            expect(gqlPermission).to.include({ role_id: roleId, permission_name: nameOfPermissionToGrant, allow: true });
                            expect(dbPermission).to.include(gqlPermission);
                        });
                    });

                    context("and permission entry does not exist", () => {
                        it("should return the permission with 'allow' set to true and create a database entry", async () => {
                            const gqlPermission = await grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });

                            const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                            expect(gqlPermission).to.exist;
                            expect(gqlPermission).to.include({ role_id: roleId, permission_name: nameOfPermissionToGrant, allow: true });
                            expect(dbPermission).to.include(gqlPermission);
                        });
                    });
                });

                context("when user does not have the 'edit role permissions' permission within the organization", () => {
                    context("and permission entry exists with allow set to false", () => {
                        beforeEach(async () => {
                            await denyPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });
                        });

                        it("should throw a permission exception, and not create a database entry", async () => {
                            const fn = () => grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });
                            expect(fn()).to.be.rejected;

                            const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                            expect(dbPermission.allow).to.equal(false);
                        });
                    });

                    context("and permission entry does not exist", () => {
                        it("should throw a permission exception, and not create a database entry", async () => {
                            const fn = () => grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });
                            expect(fn()).to.be.rejected;

                            const dbPermission = await Permission.findOne({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                            expect(dbPermission).to.be.undefined;
                        });
                    });
                });
            });
        });

        context("when is not a system role", () => {
            context("when user has the 'edit role permissions' permission within the organization", () => {
                beforeEach(async () => {
                    await grantPermission(testClient, roleId, PermissionName.edit_role_permissions_30332, { authorization: JoeAuthToken });
                });

                context("and permission entry exists with allow set to false", () => {
                    beforeEach(async () => {
                        await denyPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });
                    });

                    it("should return the permission with 'allow' set to true and update the database entry", async () => {
                        const gqlPermission = await grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: BillyAuthToken });

                        const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                        expect(gqlPermission).to.exist;
                        expect(gqlPermission).to.include({ role_id: roleId, permission_name: nameOfPermissionToGrant, allow: true });
                        expect(dbPermission).to.include(gqlPermission);
                    });
                });

                context("and permission entry does not exist", () => {
                    it("should return the permission with 'allow' set to true and create a database entry", async () => {
                        const gqlPermission = await grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: BillyAuthToken });

                        const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                        expect(gqlPermission).to.exist;
                        expect(gqlPermission).to.include({ role_id: roleId, permission_name: nameOfPermissionToGrant, allow: true });
                        expect(dbPermission).to.include(gqlPermission);
                    });
                });
            });

            context("when user does not have the 'edit role permissions' permission within the organization", () => {
                context("and permission entry exists with allow set to false", () => {
                    beforeEach(async () => {
                        await denyPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: JoeAuthToken });
                    });

                    it("should throw a permission exception, and not create a database entry", async () => {
                        const fn = () => grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: BillyAuthToken });
                        expect(fn()).to.be.rejected;

                        const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                        expect(dbPermission.allow).to.equal(false);
                    });
                });

                context("and permission entry does not exist", () => {
                    it("should throw a permission exception, and not create a database entry", async () => {
                        const fn = () => grantPermission(testClient, roleId, nameOfPermissionToGrant, { authorization: BillyAuthToken });
                        expect(fn()).to.be.rejected;

                        const dbPermission = await Permission.findOne({ where: { role_id: roleId, permission_name: nameOfPermissionToGrant } });
                        expect(dbPermission).to.be.undefined;
                    });
                });
            });
        });
    });

    describe("editPermissions", () => {
        const nameOfPermission = PermissionName.edit_groups_30330;
        let permission : Permission;
        let organizationId: string;
        let userId: string;
        let roleId: string;

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            userId = (await createUserBilly(testClient)).user_id;
            organizationId = (await createOrganizationAndValidate(testClient, orgOwner.user_id, "org 1")).organization_id;
            await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: JoeAuthToken });
            roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
        });

        context("when is a system role", () => {
            beforeEach(async () => {
                await updateRole(testClient, { roleId, systemRole: true }, { authorization: JoeAuthToken });
            });

            context("and the user is not an admin", () => {
                it("raises a permission exception", async () => {
                    const fn = () => editPermissions(testClient, roleId, [nameOfPermission], { authorization: undefined });

                    expect(fn()).to.be.rejected;
                    const dbRole = await Role.findOneOrFail(roleId);
                    const dbPermissions = await dbRole.permissions || [];
                    expect(dbPermissions).to.be.empty;
                });
            });

            context("and the user is an admin", () => {
                context("and the user does not have edit roles permission", () => {
                    beforeEach(async () => {
                        roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
                        await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
                    });

                    it("throws a permission exception and not mutate the database entries", async () => {
                        const fn = () => editPermissions(testClient, roleId, [nameOfPermission], { authorization: JoeAuthToken });

                        expect(fn()).to.be.rejected;
                        const dbRole = await Role.findOneOrFail(roleId);
                        const dbPermissions = await dbRole.permissions || [];
                        expect(dbPermissions).to.be.empty;
                    });
                });

                context("and the user has all the permissions", () => {
                    let permissionInfo = (permission : Permission) => {
                        return permission.permission_name
                    }
                    const editRolePermission = PermissionName.edit_role_permissions_30332;

                    beforeEach(async () => {
                        roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
                        await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
                        await grantPermission(testClient, roleId, editRolePermission, { authorization: JoeAuthToken });
                    });

                    it("edits permissions in role", async () => {
                        let gqlPermissions = await editPermissions(testClient, roleId, [editRolePermission, nameOfPermission], { authorization: JoeAuthToken });
                        expect(gqlPermissions.map(permissionInfo)).to.deep.eq([editRolePermission, nameOfPermission]);
                        let dbRole = await Role.findOneOrFail(roleId);
                        let dbPermissions = await dbRole.permissions || [];
                        expect(dbPermissions.map(permissionInfo)).to.deep.eq([editRolePermission, nameOfPermission]);

                        gqlPermissions = await editPermissions(testClient, roleId, [], { authorization: JoeAuthToken });
                        expect(gqlPermissions).to.be.empty;
                        dbRole = await Role.findOneOrFail(roleId);
                        dbPermissions = await dbRole.permissions || [];
                        expect(dbPermissions).to.be.empty
                    });
                });
            });
        });

        context("when is not a system role", () => {
            context("when not authenticated", () => {
                beforeEach(async () => {
                    await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
                });

                it("throws a permission exception and not mutate the database entries", async () => {
                    const fn = () => editPermissions(testClient, roleId, [nameOfPermission], { authorization: undefined });

                    expect(fn()).to.be.rejected;
                    const dbRole = await Role.findOneOrFail(roleId);
                    const dbPermissions = await dbRole.permissions || [];
                    expect(dbPermissions).to.be.empty;
                });
            });

            context("when authenticated", () => {
                context("and the user does not have edit roles permission", () => {
                    beforeEach(async () => {
                        roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
                        await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
                    });

                    it("throws a permission exception and not mutate the database entries", async () => {
                        const fn = () => editPermissions(testClient, roleId, [nameOfPermission], { authorization: BillyAuthToken });

                        expect(fn()).to.be.rejected;
                        const dbRole = await Role.findOneOrFail(roleId);
                        const dbPermissions = await dbRole.permissions || [];
                        expect(dbPermissions).to.be.empty;
                    });
                });

                context("and the user has all the permissions", () => {
                    let permissionInfo = (permission : Permission) => {
                        return permission.permission_name
                    }
                    const editRolePermission = PermissionName.edit_role_permissions_30332;

                    beforeEach(async () => {
                        roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
                        await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
                        await grantPermission(testClient, roleId, editRolePermission, { authorization: JoeAuthToken });
                    });

                    it("edits permissions in role", async () => {
                        let gqlPermissions = await editPermissions(testClient, roleId, [editRolePermission, nameOfPermission], { authorization: BillyAuthToken });
                        expect(gqlPermissions.map(permissionInfo)).to.deep.eq([editRolePermission, nameOfPermission]);
                        let dbRole = await Role.findOneOrFail(roleId);
                        let dbPermissions = await dbRole.permissions || [];
                        expect(dbPermissions.map(permissionInfo)).to.deep.eq([editRolePermission, nameOfPermission]);

                        gqlPermissions = await editPermissions(testClient, roleId, [], { authorization: BillyAuthToken });
                        expect(gqlPermissions).to.be.empty;
                        dbRole = await Role.findOneOrFail(roleId);
                        dbPermissions = await dbRole.permissions || [];
                        expect(dbPermissions).to.be.empty
                    });
                });
            });
        });
    });

    describe("revoke", () => {
        const nameOfPermissionToRevoke = PermissionName.view_role_permissions_30112;
        let organizationId: string;
        let userId: string;
        let roleId: string;

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            userId = (await createUserBilly(testClient)).user_id;
            organizationId = (await createOrganizationAndValidate(testClient, orgOwner.user_id, "org 1")).organization_id;
            await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: JoeAuthToken });
            roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
            await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
            await grantPermission(testClient, roleId, nameOfPermissionToRevoke, { authorization: JoeAuthToken });
        });

        context("when is a system role", () => {
            beforeEach(async () => {
                await updateRole(testClient, { roleId, systemRole: true }, { authorization: JoeAuthToken });
            });

            context("and the user is not an admin", () => {
                it("raises a permission exception", async () => {
                    const fn = () => revokePermission(testClient, roleId, nameOfPermissionToRevoke, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;

                    const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToRevoke } });
                    expect(dbPermission.allow).to.be.true;
                });
            });

            context("and the user is an admin", () => {
                context("when user has the 'edit role permissions' permission within the organization", () => {
                    beforeEach(async () => {
                        await grantPermission(testClient, roleId, PermissionName.edit_role_permissions_30332, { authorization: JoeAuthToken });
                    });

                    it("should return true and delete the database entry", async () => {
                        const successful = await revokePermission(testClient, roleId, nameOfPermissionToRevoke, { authorization: JoeAuthToken });

                        const dbPermission = await Permission.findOne({ where: { role_id: roleId, permission_name: nameOfPermissionToRevoke } });
                        expect(successful).to.be.true;
                        expect(dbPermission).to.be.undefined;
                    });
                });

                context("when user does not have the 'edit role permissions' permission within the organization", () => {
                    it("should throw a permission exception and not delete/modify the database entry", async () => {
                        const fn = () => revokePermission(testClient, roleId, nameOfPermissionToRevoke, { authorization: JoeAuthToken });
                        expect(fn()).to.be.rejected;

                        const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToRevoke } });
                        expect(dbPermission.allow).to.be.true;
                    });
                });
            });
        });

        context("when is not a system role", () => {
            context("when user has the 'edit role permissions' permission within the organization", () => {
                beforeEach(async () => {
                    await grantPermission(testClient, roleId, PermissionName.edit_role_permissions_30332, { authorization: JoeAuthToken });
                });

                it("should return true and delete the database entry", async () => {
                    const successful = await revokePermission(testClient, roleId, nameOfPermissionToRevoke, { authorization: BillyAuthToken });

                    const dbPermission = await Permission.findOne({ where: { role_id: roleId, permission_name: nameOfPermissionToRevoke } });
                    expect(successful).to.be.true;
                    expect(dbPermission).to.be.undefined;
                });
            });

            context("when user does not have the 'edit role permissions' permission within the organization", () => {
                it("should throw a permission exception and not delete/modify the database entry", async () => {
                    const fn = () => revokePermission(testClient, roleId, nameOfPermissionToRevoke, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;

                    const dbPermission = await Permission.findOneOrFail({ where: { role_id: roleId, permission_name: nameOfPermissionToRevoke } });
                    expect(dbPermission.allow).to.be.true;
                });
            });
        });
    });

    describe("delete_role", () => {
        let organizationId: string;
        let userId: string;
        let roleId: string;

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            userId = (await createUserBilly(testClient)).user_id;
            organizationId = (await createOrganizationAndValidate(testClient, orgOwner.user_id, "org 1")).organization_id;
            await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: JoeAuthToken });
            roleId = (await createRole(testClient, organizationId, "My Role")).role_id;
            await addRoleToOrganizationMembership(testClient, userId, organizationId, roleId, { authorization: JoeAuthToken });
        });

        context("when is a system role", () => {
            beforeEach(async () => {
                await updateRole(testClient, { roleId, systemRole: true }, { authorization: JoeAuthToken });
            });

            context("and the user is not an admin", () => {
                it("raises a permission exception", async () => {
                    const fn = () => deleteRole(testClient, roleId, { authorization: BillyAuthToken });
                    expect(fn()).to.be.rejected;

                    const dbRole = await Role.findOneOrFail(roleId);
                    expect(dbRole.status).to.eq(Status.ACTIVE);
                    expect(dbRole.deleted_at).to.be.null;
                });
            });

            context("and the user is an admin", () => {
                context("and the user does not have delete role permissions", () => {
                    it("throws a permission exception, and not delete the database entry", async () => {
                        const fn = () => deleteRole(testClient, roleId, { authorization: JoeAuthToken });
                        expect(fn()).to.be.rejected;

                        const dbRole = await Role.findOneOrFail(roleId);
                        expect(dbRole.status).to.eq(Status.ACTIVE);
                        expect(dbRole.deleted_at).to.be.null;
                    });
                });

                context("and the user has all the permissions", () => {
                    beforeEach(async () => {
                        await grantPermission(testClient, roleId, PermissionName.delete_groups_30440, { authorization: JoeAuthToken });
                    });

                    it("deletes the role", async () => {
                        const gqlDeleteRole = await deleteRole(testClient, roleId, { authorization: JoeAuthToken });
                        expect(gqlDeleteRole).to.be.true;

                        const dbRole = await Role.findOneOrFail(roleId);
                        expect(dbRole.status).to.eq(Status.INACTIVE);
                        expect(dbRole.deleted_at).not.to.be.null;
                    });

                    context("and the role is marked as inactive", () => {
                        beforeEach(async () => {
                            await deleteRole(testClient, roleId, { authorization: JoeAuthToken });
                        });

                        it("fails to delete the role", async () => {
                            const gqlDeleteRole = await deleteRole(testClient, roleId, { authorization: JoeAuthToken });
                            expect(gqlDeleteRole).to.be.null;

                            const dbRole = await Role.findOneOrFail(roleId);
                            expect(dbRole.status).to.eq(Status.INACTIVE);
                            expect(dbRole.deleted_at).not.to.be.null;
                        });
                    });
                });
            });
        });

        context("when is not a system role", () => {
            context("when not authenticated", () => {
                it("throws a permission exception, and not delete the database entry", async () => {
                    const fn = () => deleteRole(testClient, roleId, { authorization: undefined });
                    expect(fn()).to.be.rejected;

                    const dbRole = await Role.findOneOrFail(roleId);
                    expect(dbRole.status).to.eq(Status.ACTIVE);
                    expect(dbRole.deleted_at).to.be.null;
                });
            });

            context("when authenticated", () => {
                context("and the user does not have delete role permissions", () => {
                    it("throws a permission exception, and not delete the database entry", async () => {
                        const fn = () => deleteRole(testClient, roleId, { authorization: BillyAuthToken });
                        expect(fn()).to.be.rejected;

                        const dbRole = await Role.findOneOrFail(roleId);
                        expect(dbRole.status).to.eq(Status.ACTIVE);
                        expect(dbRole.deleted_at).to.be.null;
                    });
                });

                context("and the user has all the permissions", () => {
                    beforeEach(async () => {
                        await grantPermission(testClient, roleId, PermissionName.delete_groups_30440, { authorization: JoeAuthToken });
                    });

                    it("deletes the role", async () => {
                        const gqlDeleteRole = await deleteRole(testClient, roleId, { authorization: BillyAuthToken });
                        expect(gqlDeleteRole).to.be.true;

                        const dbRole = await Role.findOneOrFail(roleId);
                        expect(dbRole.status).to.eq(Status.INACTIVE);
                        expect(dbRole.deleted_at).not.to.be.null;
                    });

                    context("and the role is marked as inactive", () => {
                        beforeEach(async () => {
                            await deleteRole(testClient, roleId, { authorization: JoeAuthToken });
                        });

                        it("fails to delete the role", async () => {
                            const gqlDeleteRole = await deleteRole(testClient, roleId, { authorization: BillyAuthToken });
                            expect(gqlDeleteRole).to.be.null;

                            const dbRole = await Role.findOneOrFail(roleId);
                            expect(dbRole.status).to.eq(Status.INACTIVE);
                            expect(dbRole.deleted_at).not.to.be.null;
                        });
                    });
                });
            });
        });
    });
});
