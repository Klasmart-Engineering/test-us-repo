import { expect, use } from "chai";
import { Connection } from "typeorm"
import { Model } from "../../src/model";
import { createTestConnection } from "../utils/testConnection";
import { createServer } from "../../src/utils/createServer";
import { accountUUID, User } from "../../src/entities/user";
import { OrganizationMembership } from "../../src/entities/organizationMembership";
import { OrganizationOwnership } from "../../src/entities/organizationOwnership";
import {
    createOrganizationAndValidate,
    createOrganization,
    getClassesStudying,
    getClassesTeaching,
    getOrganizationMembership,
    getOrganizationMemberships,
    getSchoolMembership,
    getSchoolMemberships,
    getUserSchoolMembershipsWithPermission,
    mergeUser,
    updateUser,
    setPrimaryUser,
    updateUserEmail,
    getSubjectsTeaching
} from "../utils/operations/userOps";
import { createUserBilly, createUserJoe } from "../utils/testEntities";
import { createSchool, createClass, createRole } from "../utils/operations/organizationOps";
import { addStudentToClass, addTeacherToClass, editSubjects } from "../utils/operations/classOps";
import { ApolloServerTestClient, createTestClient } from "../utils/createTestClient";
import { addOrganizationToUserAndValidate } from "../utils/operations/userOps";
import { addUserToSchool } from "../utils/operations/schoolOps";
import { SchoolMembership } from "../../src/entities/schoolMembership";
import { getBillyAuthToken, getJoeAuthToken } from "../utils/testConfig";
import { PermissionName } from "../../src/permissions/permissionNames";
import { grantPermission } from "../utils/operations/roleOps";
import { addRoleToOrganizationMembership } from "../utils/operations/organizationMembershipOps";
import { addRoleToSchoolMembership, schoolMembershipCheckAllowed } from "../utils/operations/schoolMembershipOps";
import { createUserAndValidate } from "../utils/operations/modelOps";
import { Organization } from "../../src/entities/organization";
import { Role } from "../../src/entities/role";
import { Status } from "../../src/entities/status";
import { gql } from "apollo-server-express";
import { Class } from "../../src/entities/class";

import chaiAsPromised from "chai-as-promised";
import { SHORTCODE_DEFAULT_MAXLEN } from "../../src/utils/shortcode";
import { Subject } from "../../src/entities/subject";
import { createSubject } from "../factories/subject.factory";

use(chaiAsPromised);

describe("user", () => {
    let connection: Connection;
    let originalAdmins: string[];
    let testClient: ApolloServerTestClient;
    let user: User;
    let user2: User;

    before(async () => {
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    after(async () => {
        await connection?.close();
    });

    describe("set", () => {
        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        it("should set the specified user properties", async () => {
            const gqlUpdatedUser = await updateUser(testClient, user, { authorization: getJoeAuthToken() });
            const dbUser = await User.findOneOrFail({ where: { user_id: user.user_id } });
            expect(gqlUpdatedUser).to.exist;
            expect(dbUser).to.include(gqlUpdatedUser);
            expect(dbUser.date_of_birth).to.eq(gqlUpdatedUser.date_of_birth)
            expect(dbUser.gender).to.eq(gqlUpdatedUser.gender)
            expect(dbUser.alternate_email).to.eq(gqlUpdatedUser.alternate_email)
            expect(dbUser.alternate_phone).to.eq(gqlUpdatedUser.alternate_phone)
        });
    });

    describe("setPrimary", () => {
        beforeEach(async () => {
            user = await createUserJoe(testClient);
            user2 = await createUserBilly(testClient);
        });

        context("when primary user doesn't exists", () => {
            it("should set an user as primary", async () => {
                const gqlPrimaryUser = await setPrimaryUser(
                    testClient,
                    user,
                    { authorization: getJoeAuthToken() }
                );
                const dbUser = await User.findOneOrFail({
                    where: { user_id: user.user_id }
                });

                expect(gqlPrimaryUser).to.exist;
                expect(dbUser).to.include(gqlPrimaryUser);
                expect(dbUser.primary).to.eq(gqlPrimaryUser.primary);
            });
        });

        context("when primary user already exists", () => {
            it("should unset it and set another as primary",
            async () => {
                await updateUserEmail(
                    testClient,
                    user2,
                    user.email as string,
                    { authorization: getBillyAuthToken() }
                );

                const gqlPrimaryUser = await setPrimaryUser(
                    testClient,
                    user,
                    { authorization: getJoeAuthToken() }
                );
                const gqlNewPrimaryUser = await setPrimaryUser(
                    testClient,
                    user2,
                    { authorization: getBillyAuthToken() }
                );

                const dbUser = await User.findOneOrFail({
                    where: { user_id: user.user_id }
                });
                const dbNewPrimaryUser = await User.findOneOrFail({
                    where: { user_id: user2.user_id }
                });

                expect(gqlPrimaryUser).to.exist;
                expect(dbUser.primary).to.eql(false);

                expect(gqlNewPrimaryUser).to.exist;
                expect(dbNewPrimaryUser).to.include(gqlNewPrimaryUser);
                expect(dbNewPrimaryUser.primary).to.eql(true);
            });
        });

        it("should unset the current primary user and set another as primary",
        async () => {
            await updateUserEmail(
                testClient,
                user2,
                user.email as string,
                { authorization: getBillyAuthToken() }
            );

            const gqlPrimaryUser = await setPrimaryUser(
                testClient,
                user,
                { authorization: getJoeAuthToken() }
            );
            const gqlNewPrimaryUser = await setPrimaryUser(
                testClient,
                user2,
                { authorization: getBillyAuthToken() }
            );

            const dbUser = await User.findOneOrFail({
                where: { user_id: user.user_id }
            });
            const dbNewPrimaryUser = await User.findOneOrFail({
                where: { user_id: user2.user_id }
            });

            expect(gqlPrimaryUser).to.exist;
            expect(dbUser.primary).to.eql(false);

            expect(gqlNewPrimaryUser).to.exist;
            expect(dbNewPrimaryUser).to.include(gqlNewPrimaryUser);
            expect(dbNewPrimaryUser.primary).to.eql(true);
        });
    });

    describe("memberships", () => {
        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when none", () => {
            it("should return an empty array", async () => {
                const gqlMemberships = await getOrganizationMemberships(testClient, user, { authorization: getJoeAuthToken() });
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships).to.be.empty;
            });
        });

        context("when one", () => {
            beforeEach(async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id);
                await addOrganizationToUserAndValidate(testClient, user.user_id, organization.organization_id);
            });

            it("should return an array containing one organization membership", async () => {
                const gqlMemberships = await getOrganizationMemberships(testClient, user, { authorization: getJoeAuthToken() });
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(1);
            });
        });
    });

    describe("membership", () => {
        let organizationId: string;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            const organization = await createOrganizationAndValidate(testClient, user.user_id);
            organizationId = organization.organization_id;
            await addOrganizationToUserAndValidate(testClient, user.user_id, organizationId);
        });

        it("should get the organization membership associated with the specified organization ID", async () => {
            const gqlMembership = await getOrganizationMembership(testClient, user.user_id, organizationId, { authorization: getJoeAuthToken() });
            const dbMembership = await OrganizationMembership.findOneOrFail({
                where: {
                    user_id: user.user_id,
                    organization_id: organizationId,
                }
            });

            expect(gqlMembership).to.exist;
            expect(dbMembership).to.include(gqlMembership);
        });
    });

    describe("school_memberships", () => {
        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when none", () => {
            it("should return an empty array", async () => {
                const gqlMemberships = await getSchoolMemberships(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships).to.be.empty;
            });
        });

        context("when one", () => {
            beforeEach(async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id);
                const school = await createSchool(testClient, organization.organization_id, "my school", undefined, { authorization: getJoeAuthToken() });
                await addUserToSchool(testClient, user.user_id, school.school_id, { authorization: getJoeAuthToken() })
            });

            it("should return an array containing one school membership", async () => {
                const gqlMemberships = await getSchoolMemberships(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(1);
            });
        });
    });

    describe("school_membership", () => {
        let schoolId: string;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            const organization = await createOrganizationAndValidate(testClient, user.user_id);
            const school = await createSchool(testClient, organization.organization_id, "my school", undefined, { authorization: getJoeAuthToken() });
            schoolId = school.school_id;
            await addUserToSchool(testClient, user.user_id, schoolId, { authorization: getJoeAuthToken() });
        });

        it("should get school membership", async () => {
            const gqlMembership = await getSchoolMembership(testClient, user.user_id, schoolId, { authorization: getJoeAuthToken() });
            const dbMembership = await SchoolMembership.findOneOrFail({
                where: {
                    user_id: user.user_id,
                    school_id: schoolId,
                }
            });

            expect(gqlMembership).to.exist;
            expect(dbMembership).to.include(gqlMembership);
        });
    });

    describe("classesTeaching", () => {
        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when none", () => {
            it("should return an empty array", async () => {
                const gqlClasses = await getClassesTeaching(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlClasses).to.exist;
                expect(gqlClasses).to.be.empty;
            });
        });

        context("when one", async () => {
            beforeEach(async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id);
                const cls = await createClass(testClient, organization.organization_id);
                await addTeacherToClass(testClient, cls.class_id, user.user_id, { authorization: getJoeAuthToken() });
            });

            it("should return an array containing one class", async () => {
                const gqlClasses = await getClassesTeaching(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlClasses).to.exist;
                expect(gqlClasses).to.have.lengthOf(1);
            });
        });
    });

    describe("classesStudying", () => {
        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when none", () => {
            it("should return an empty array", async () => {
                const gqlClasses = await getClassesStudying(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlClasses).to.exist;
                expect(gqlClasses).to.be.empty;
            });
        });

        context("when one", () => {
            beforeEach(async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id);
                const cls = await createClass(testClient, organization.organization_id);
                await addStudentToClass(testClient, cls.class_id, user.user_id, { authorization: getJoeAuthToken() });
            });

            it("should return an array containing one class", async () => {
                const gqlClasses = await getClassesStudying(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlClasses).to.exist;
                expect(gqlClasses).to.have.lengthOf(1);
            });
        });
    });

    describe("createOrganization", () => {
        const shortcode_re = /^[A-Z|0-9]+$/
        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        it("should create an organization", async () => {
            const organization = await createOrganizationAndValidate(testClient, user.user_id);
            expect(organization).to.exist;
            expect(organization.shortCode).to.match(shortcode_re)
            expect(organization.shortCode?.length).to.equal(SHORTCODE_DEFAULT_MAXLEN)
        });

        context("when organization shortcode is undefined", () => {
            it("creates an organization", async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id, undefined, undefined);
                expect(organization).to.exist;
                expect(organization.shortCode).to.match(shortcode_re)
                expect(organization.shortCode).not.to.be.undefined
            });
        });

        context("when organization shortcode is empty", () => {
            it("creates an organization", async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id, undefined, "");
                expect(organization).to.exist;
                expect(organization.shortCode).to.match(shortcode_re)
                expect(organization.shortCode).not.to.be.empty
            });
        });

        context("when organization shortcode is not empty", () => {
            context("and the shortcode is valid", () => {
                it("creates an organization", async () => {
                    const organization = await createOrganizationAndValidate(testClient, user.user_id, undefined, "happy1");
                    expect(organization).to.exist;
                    expect(organization.shortCode).to.match(shortcode_re)
                    expect(organization.shortCode).to.equal("HAPPY1")
                });
            });

            context("and the shortcode is not valid", () => {
                it("should fail to create an organization with a bad short code", async () => {
                    const fn = () => createOrganization(testClient, user.user_id, "A name", "very wrong");

                    expect(fn()).to.be.rejected;
                });
            });
        });

        context("when the given organization name already exist", () => {
            it("should throw an error", async () => {
                const organization_name = "A name";
                const fn = () => createOrganization(testClient, user.user_id, organization_name);
                expect(fn()).to.be.rejected;

                const dbOrg = await Organization.findOne({
                    where: { organization_name }
                });
                expect(dbOrg).to.be.undefined;
            })
        })

        it("creates the organization ownership", async () => {
            const organization = await createOrganizationAndValidate(testClient, user.user_id);
            const organizationOwnership = await OrganizationOwnership.find({
                where: { organization_id: organization.organization_id, user_id: user.user_id }
            })

            expect(organizationOwnership).to.exist;
        });

        context("when the user already has an active organisation", () => {
            beforeEach(async () => {
                const organization = await createOrganizationAndValidate(testClient, user.user_id);
            });

            it("does not create another organisation", async () => {
                const fn = () => createOrganization(testClient, user.user_id, "Another Org");

                expect(fn()).to.be.rejected;
            });
        });
    });

    describe("addOrganization", () => {
        let organizationId: string;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            const organization = await createOrganizationAndValidate(testClient, user.user_id);
            organizationId = organization.organization_id;
        });

        it("user should join the specified organization", async () => {
            const membership = await addOrganizationToUserAndValidate(testClient, user.user_id, organizationId);
            expect(membership).to.exist;
        });
    });

    describe("schoolsWithPermission", () => {
        let organization1Id: string;
        let school1Id: string;
        let school2Id: string;
        let org1RoleId: string;
        let org2RoleId: string;
        let idOfUserToBeQueried: string;
        let tokenOfOrg1Owner:string
        let tokenOfOrg2Owner:string
        const permissionName = PermissionName.edit_groups_30330;
        const userToBeQueried = {
            email: "testuser@gmail.com",
        } as User;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            tokenOfOrg1Owner = getJoeAuthToken();
            const idOfOrg1Owner = user.user_id;
            const idOfOrg2Owner = (await createUserBilly(testClient)).user_id;
            tokenOfOrg2Owner = getBillyAuthToken();
            idOfUserToBeQueried = (await createUserAndValidate(testClient, userToBeQueried)).user_id;
            organization1Id = (await createOrganizationAndValidate(testClient, idOfOrg1Owner)).organization_id;
            const organization2Id = (await createOrganizationAndValidate(testClient, idOfOrg2Owner, tokenOfOrg2Owner)).organization_id;
            await addOrganizationToUserAndValidate(testClient, idOfUserToBeQueried, organization1Id, tokenOfOrg1Owner);
            await addOrganizationToUserAndValidate(testClient, idOfUserToBeQueried, organization2Id, tokenOfOrg2Owner);
            school1Id = (await createSchool(testClient, organization1Id, "School 1", undefined, { authorization: tokenOfOrg1Owner })).school_id;
            school2Id = (await createSchool(testClient, organization2Id, "School 2", undefined, { authorization: tokenOfOrg2Owner })).school_id;
            await addUserToSchool(testClient, idOfUserToBeQueried, school1Id, { authorization: tokenOfOrg1Owner });
            await addUserToSchool(testClient, idOfUserToBeQueried, school2Id, { authorization: tokenOfOrg2Owner });
            await addUserToSchool(testClient, idOfOrg1Owner, school1Id, { authorization: tokenOfOrg1Owner });
            await addUserToSchool(testClient, idOfOrg1Owner, school2Id, { authorization: tokenOfOrg2Owner });
            org1RoleId = (await createRole(testClient, organization1Id, "Org 1 Role")).role_id;
            org2RoleId = (await createRole(testClient, organization2Id, "Org 2 Role", "Org 2 role description", tokenOfOrg2Owner)).role_id;
            await grantPermission(testClient, org1RoleId, permissionName, { authorization: tokenOfOrg1Owner });
            await grantPermission(testClient, org2RoleId, permissionName, { authorization: tokenOfOrg2Owner });
        });

        context("when user being queried has the specified permission in a school's organization", () => {
            beforeEach(async () => {
                await addRoleToSchoolMembership(testClient, idOfUserToBeQueried, school1Id, org1RoleId, { authorization: tokenOfOrg1Owner });
            });

            it("should return an array containing one school membership", async () => {
                const gqlMemberships = await getUserSchoolMembershipsWithPermission(testClient, idOfUserToBeQueried, permissionName, { authorization: tokenOfOrg1Owner });
                const isAllowed = await schoolMembershipCheckAllowed(testClient, idOfUserToBeQueried, school1Id, permissionName);
                expect(isAllowed).to.be.true;
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(1);
            });
        });

        context("when user being queried does not have the specified permission in a school's organization", () => {
            it("should return an empty array", async () => {
                const gqlMemberships = await getUserSchoolMembershipsWithPermission(testClient, idOfUserToBeQueried, permissionName, { authorization: tokenOfOrg1Owner });
                const isAllowed = await schoolMembershipCheckAllowed(testClient, idOfUserToBeQueried, school1Id, permissionName);
                expect(isAllowed).to.be.false;
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(0);
            });
        });

        context("when user being queried has the specified permission in a school", () => {
            beforeEach(async () => {
                await addRoleToSchoolMembership(testClient, idOfUserToBeQueried, school1Id, org1RoleId, { authorization: tokenOfOrg1Owner });
            });

            it("should return an array containing one school membership", async () => {
                const gqlMemberships = await getUserSchoolMembershipsWithPermission(testClient, idOfUserToBeQueried, permissionName, { authorization: tokenOfOrg1Owner });
                const isAllowed = await schoolMembershipCheckAllowed(testClient, idOfUserToBeQueried, school1Id, permissionName);
                expect(isAllowed).to.be.true;
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(1);
            });
        });

        context("when user being queried does not have the specified permission in a school", () => {
            it("should return an empty array", async () => {
                const gqlMemberships = await getUserSchoolMembershipsWithPermission(testClient, idOfUserToBeQueried, permissionName, { authorization: tokenOfOrg1Owner });
                const isAllowed = await schoolMembershipCheckAllowed(testClient, idOfUserToBeQueried, school1Id, permissionName);
                expect(isAllowed).to.be.false;
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(0);
            });
        });

        context("when user being queried has the specified permission in organization 1 and in school 2 of organization 2", () => {
            beforeEach(async () => {
                await addRoleToOrganizationMembership(testClient, idOfUserToBeQueried, organization1Id, org1RoleId, { authorization: tokenOfOrg1Owner });
                await addRoleToSchoolMembership(testClient, idOfUserToBeQueried, school2Id, org2RoleId, { authorization: tokenOfOrg2Owner });
            });

            it("should return an array containing two school memberships", async () => {
                const gqlMemberships = await getUserSchoolMembershipsWithPermission(testClient, idOfUserToBeQueried, permissionName, { authorization: tokenOfOrg1Owner });
                const isAllowed1 = await schoolMembershipCheckAllowed(testClient, idOfUserToBeQueried, school1Id, permissionName);
                const isAllowed2 = await schoolMembershipCheckAllowed(testClient, idOfUserToBeQueried, school2Id, permissionName);
                expect(isAllowed1).to.be.true;
                expect(isAllowed2).to.be.true;
                expect(gqlMemberships).to.exist;
                expect(gqlMemberships.length).to.equal(2);
            });
        });
    });
    describe("merge", () => {
        let joeUser: User
        let organization: Organization
        let organizationId: string
        let role: Role
        let roleId: string
        let schoolId: string
        beforeEach(async () => {
            joeUser = await createUserJoe(testClient);
            organization = await createOrganizationAndValidate(testClient, joeUser.user_id);
            organizationId = organization.organization_id
            role = await createRole(testClient, organization.organization_id, "student");
            roleId = role.role_id
            schoolId = (await createSchool(testClient, organizationId, "school 1", undefined, { authorization: getJoeAuthToken() })).school_id;
        });
        it("should merge one user into another deleting the source user", async () => {

            let anne = {
                given_name: "Anne",
                family_name: "Bob",
                email: "anne@gmail.com",
                avatar: "anne_avatar"
            } as User

            // oldUser is a bare user with no memberships
            let oldUser = await createUserAndValidate(testClient, anne)
            let object = await organization["_setMembership"](false, false, undefined, "bob@nowhere.com", undefined, "Bob", "Smith", undefined, "Buster", "male", undefined, new Array(roleId), Array(schoolId), new Array(roleId))

            let newUser = object.user
            let membership = object.membership
            let schoolmemberships = object.schoolMemberships
            // newUser has memberships
            expect(newUser).to.exist
            expect(newUser.email).to.equal("bob@nowhere.com")

            expect(schoolmemberships).to.exist
            if(schoolmemberships){
                expect(schoolmemberships.length).to.equal(1)
                expect(schoolmemberships[0].user_id).to.equal(newUser.user_id)
                expect(schoolmemberships[0].school_id).to.equal(schoolId)
            }
            expect(membership).to.exist
            expect(membership.organization_id).to.equal(organizationId)
            expect(membership.user_id).to.equal(newUser.user_id)
            // Merging newUser into oldUser
            let gqlUser = await mergeUser(testClient, oldUser.user_id, newUser.user_id, { authorization: getJoeAuthToken() })
            // OldUser should have taken on newUser's memberships
            expect(gqlUser).to.exist
            expect(gqlUser.user_id).to.equal(oldUser.user_id)
            let newMemberships = await gqlUser.memberships
            expect(newMemberships).to.exist
            if (newMemberships !== undefined) {
                expect(newMemberships.length).to.equal(1)
                expect(newMemberships[0].organization_id).to.equal(organizationId)
                expect(newMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            let newSchoolMemberships = await gqlUser.school_memberships
            expect(newSchoolMemberships).to.exist
            if (newSchoolMemberships !== undefined) {
                expect(newSchoolMemberships.length).to.equal(1)
                expect(newSchoolMemberships[0].school_id).to.equal(schoolId)
                expect(newSchoolMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            // The same for the db object
            let dbOldUser = await User.findOneOrFail({where:{ user_id: oldUser.user_id} })
            expect(dbOldUser).to.exist
            newMemberships = await dbOldUser.memberships
            expect(newMemberships).to.exist
            if (newMemberships !== undefined) {
                expect(newMemberships.length).to.equal(1)
                expect(newMemberships[0].organization_id).to.equal(organizationId)
                expect(newMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            newSchoolMemberships = await dbOldUser.school_memberships
            expect(newSchoolMemberships).to.exist
            if (newSchoolMemberships !== undefined) {
                expect(newSchoolMemberships.length).to.equal(1)
                expect(newSchoolMemberships[0].school_id).to.equal(schoolId)
                expect(newSchoolMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            // newUser has been deleted
            let dbNewUser = await User.findOne({where: { user_id: newUser.user_id }})
            expect(dbNewUser).to.not.exist

        });
        it("should merge one user into another including classes deleting the source user", async () => {

            let anne = {
                given_name: "Anne",
                family_name: "Bob",
                email: "anne@gmail.com",
                avatar: "anne_avatar"
            } as User

            // oldUser is a bare user with no memberships
            let oldUser = await createUserAndValidate(testClient, anne)
	        expect(oldUser).to.exist
            let object = await organization["_setMembership"](false, false, undefined, "bob@nowhere.com", undefined, "Bob", "Smith", undefined, "Buster", "Male", undefined, new Array(roleId), Array(schoolId), new Array(roleId))

            let newUser = object.user
            let membership = object.membership
            let schoolmemberships = object.schoolMemberships
            // newUser has memberships
            expect(newUser).to.exist
            expect(newUser.email).to.equal("bob@nowhere.com")
            expect(newUser.gender).to.equal("Male")

            expect(schoolmemberships).to.exist
            if(schoolmemberships){
                expect(schoolmemberships.length).to.equal(1)
                expect(schoolmemberships[0].user_id).to.equal(newUser.user_id)
                expect(schoolmemberships[0].school_id).to.equal(schoolId)
            }
            expect(membership).to.exist
            expect(membership.organization_id).to.equal(organizationId)
            expect(membership.user_id).to.equal(newUser.user_id)

            const cls = await createClass(testClient, organization.organization_id);
            await addStudentToClass(testClient, cls.class_id, newUser.user_id, { authorization: getJoeAuthToken() });

            // Merging newUser into oldUser
            let gqlUser = await mergeUser(testClient, oldUser.user_id, newUser.user_id, { authorization: getJoeAuthToken() })
            // OldUser should have taken on newUser's memberships
            expect(gqlUser).to.exist
            expect(gqlUser.user_id).to.equal(oldUser.user_id)
            let newMemberships = await gqlUser.memberships
            expect(newMemberships).to.exist
            if (newMemberships !== undefined) {
                expect(newMemberships.length).to.equal(1)
                expect(newMemberships[0].organization_id).to.equal(organizationId)
                expect(newMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            let newSchoolMemberships = await gqlUser.school_memberships
            expect(newSchoolMemberships).to.exist
            if (newSchoolMemberships !== undefined) {
                expect(newSchoolMemberships.length).to.equal(1)
                expect(newSchoolMemberships[0].school_id).to.equal(schoolId)
                expect(newSchoolMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            let classesStudying = await gqlUser.classesStudying
            expect(classesStudying).to.exist
            if(classesStudying !== undefined){
                expect(classesStudying.length).to.equal(1)
                expect(classesStudying[0].class_id==cls.class_id)
            }
            // The same for the db object
            let dbOldUser = await User.findOneOrFail({where:{ user_id: oldUser.user_id} })
            expect(dbOldUser).to.exist
            newMemberships = await dbOldUser.memberships
            expect(newMemberships).to.exist
            if (newMemberships !== undefined) {
                expect(newMemberships.length).to.equal(1)
                expect(newMemberships[0].organization_id).to.equal(organizationId)
                expect(newMemberships[0].user_id).to.equal(oldUser.user_id)
            }
            newSchoolMemberships = await dbOldUser.school_memberships
            expect(newSchoolMemberships).to.exist
            if (newSchoolMemberships !== undefined) {
                expect(newSchoolMemberships.length).to.equal(1)
                expect(newSchoolMemberships[0].school_id).to.equal(schoolId)
                expect(newSchoolMemberships[0].user_id).to.equal(oldUser.user_id)
            }


            classesStudying = await dbOldUser.classesStudying
            expect(classesStudying).to.exist
            if(classesStudying !== undefined){
                expect(classesStudying.length).to.equal(1)
                expect(classesStudying[0].class_id==cls.class_id)

                let studying = classesStudying[0]
                let students = await studying.students
                expect (students).to.exist
                if(students != undefined){
                    students.forEach(function(student){
                        expect (student.user_id).to.not.equal(newUser.user_id)
                    })
                }
            }
            // newUser has been deleted
            let dbNewUser = await User.findOne({where: { user_id: newUser.user_id }})
            expect(dbNewUser).to.not.exist
            // deleted newUser is not a student of the class but oldUser is
            let dbClass = await Class.findOne({where:{class_id: cls.class_id}})
            expect(dbClass).to.exist
            if(dbClass !== undefined){
                let students = await dbClass.students
                expect(students).to.exist
                if(students !== undefined){
                    let found = false
                    for (const student of students){
                        expect (student.user_id).to.not.equal(newUser.user_id)
                        if(student.user_id === oldUser.user_id){
                            found = true
                        }
                    }
                    expect (found)
                }
            }
        });
    });
    describe("subjectsTeaching", () => {
        let organization : Organization;
        let cls: Class;
        let subject: Subject;
        let role: Role;
        let otherUser: User;


        beforeEach(async () => {
            user = await createUserJoe(testClient);
            otherUser =  await createUserBilly(testClient);
        });

        context("when none", () => {
            it("should return an empty array", async () => {
                const gqlSubjects = await getSubjectsTeaching(testClient, user.user_id, { authorization: getJoeAuthToken() });
                expect(gqlSubjects).to.be.empty;
            });
        });
        context("and is an ordinary user", () => {
            context("and the user is a member of the organization", () => {
                context("when one", async () => {
                    let subject_id: string
                    beforeEach(async () => {
                        organization = await createOrganizationAndValidate(testClient, user.user_id);
                        role = await createRole(testClient, organization.organization_id);
                        grantPermission(testClient, role.role_id, 'add_students_to_class_20225', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'add_teachers_to_class_20226', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'create_subjects_20227', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'edit_subjects_20337', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'edit_class_20334', { authorization: getJoeAuthToken() })
                        await addOrganizationToUserAndValidate(testClient, otherUser.user_id, organization.organization_id, getJoeAuthToken());
                        cls = await createClass(testClient, organization.organization_id);
                        await addTeacherToClass(testClient, cls.class_id, otherUser.user_id, { authorization: getJoeAuthToken() });
                        await addRoleToOrganizationMembership(testClient, otherUser.user_id, organization.organization_id, role.role_id);

                        subject = createSubject(organization)
                        await subject.save()
                        subject_id = subject.id
                        await editSubjects(testClient, cls.class_id, [subject.id], { authorization: getBillyAuthToken() });
                    });
                    it("should return an array containing one subject", async () => {
                        const gqlSubjects = await getSubjectsTeaching(testClient, otherUser.user_id, { authorization: getBillyAuthToken() });
                        expect(gqlSubjects).to.exist;
                        expect(gqlSubjects).to.have.lengthOf(1);
                        expect(gqlSubjects[0].id).to.equal(subject_id)
                    });

                });

            });
            context("and the user is a not member of the organization", () => {
                context("when one", async () => {

                    beforeEach(async () => {
                        organization = await createOrganizationAndValidate(testClient, user.user_id);
                        role = await createRole(testClient, organization.organization_id);
                        grantPermission(testClient, role.role_id, 'add_students_to_class_20225', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'add_teachers_to_class_20226', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'create_subjects_20227', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'edit_subjects_20337', { authorization: getJoeAuthToken() })
                        grantPermission(testClient, role.role_id, 'edit_class_20334', { authorization: getJoeAuthToken() })
                        await addOrganizationToUserAndValidate(testClient, user.user_id, organization.organization_id, getJoeAuthToken());
                        cls = await createClass(testClient, organization.organization_id);
                        await addTeacherToClass(testClient, cls.class_id, user.user_id, { authorization: getJoeAuthToken() });
                        await addRoleToOrganizationMembership(testClient, user.user_id, organization.organization_id, role.role_id);

                        subject = createSubject(organization)
                        await subject.save()
                        await editSubjects(testClient, cls.class_id, [subject.id], { authorization: getJoeAuthToken() });
                    });
                    it("should return an empty", async () => {
                        const gqlSubjects = await getSubjectsTeaching(testClient, user.user_id, { authorization: getBillyAuthToken() });
                        expect(gqlSubjects).to.be.empty;

                    });

                });
            });
        });
        context("and is an admin user", () => {
            context("and the admin user is not a member of the organization", () => {
                context("when one", async () => {
                    let subject_id: string
                    beforeEach(async () => {
                        organization = await createOrganizationAndValidate(testClient, otherUser.user_id);
                        role = await createRole(testClient, organization.organization_id, getBillyAuthToken());
                        grantPermission(testClient, role.role_id, 'add_students_to_class_20225', { authorization: getBillyAuthToken() })
                        grantPermission(testClient, role.role_id, 'add_teachers_to_class_20226', { authorization: getBillyAuthToken() })
                        grantPermission(testClient, role.role_id, 'create_subjects_20227', { authorization: getBillyAuthToken() })
                        grantPermission(testClient, role.role_id, 'edit_subjects_20337', { authorization: getBillyAuthToken() })
                        grantPermission(testClient, role.role_id, 'edit_class_20334', { authorization: getBillyAuthToken() })

                        cls = await createClass(testClient, organization.organization_id, getBillyAuthToken());
                        await addTeacherToClass(testClient, cls.class_id, otherUser.user_id, { authorization: getBillyAuthToken() });
                        await addRoleToOrganizationMembership(testClient, otherUser.user_id, organization.organization_id, role.role_id, { authorization: getBillyAuthToken()});
                        await addOrganizationToUserAndValidate(testClient, otherUser.user_id, organization.organization_id, getBillyAuthToken());
                        subject = createSubject(organization)
                        await subject.save()
                        subject_id = subject.id
                        await editSubjects(testClient, cls.class_id, [subject.id], { authorization: getBillyAuthToken() });
                    });
                    it("should return an array of one subject", async () => {
                        const gqlSubjects = await getSubjectsTeaching(testClient, otherUser.user_id, { authorization: getJoeAuthToken() });
                        expect(gqlSubjects).to.exist;
                        expect(gqlSubjects).to.have.lengthOf(1);
                        expect(gqlSubjects[0].id).to.equal(subject_id)
                    });
                });
            });
        });
    });
});

