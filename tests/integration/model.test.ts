import { expect, use } from "chai";
import { Connection } from "typeorm";
import { ApolloServerTestClient, createTestClient } from "../utils/createTestClient";
import { createTestConnection } from "../utils/testConnection";
import { createServer } from "../../src/utils/createServer";
import { createUserJoe, createUserBilly } from "../utils/testEntities";
import { createAgeRange } from "../factories/ageRange.factory";
import { createGrade } from "../factories/grade.factory";
import { createOrganization } from "../factories/organization.factory";
import { createRole } from "../factories/role.factory";
import { createSchool } from "../factories/school.factory";
import { createSubcategory } from "../factories/subcategory.factory";
import { createUser } from "../factories/user.factory";
import { getAgeRange, getGrade, getSubcategory, getAllOrganizations,
    getOrganizations, switchUser, me, myUsers,
    getProgram, permissionsConnection, uploadSchoolsFile, userConnection
} from "../utils/operations/modelOps";
import { getJoeAuthToken, getJoeAuthWithoutIdToken, getBillyAuthToken } from "../utils/testConfig";
import { createOrganizationAndValidate, addOrganizationToUserAndValidate, addSchoolToUser } from "../utils/operations/userOps";
import { addUserToOrganizationAndValidate } from "../utils/operations/organizationOps";
import { Model } from "../../src/model";
import { AgeRange } from "../../src/entities/ageRange";
import { Grade } from "../../src/entities/grade";
import { User } from "../../src/entities/user";
import { Permission } from "../../src/entities/permission";
import { Organization } from "../../src/entities/organization";
import { Subcategory } from "../../src/entities/subcategory";
import chaiAsPromised from "chai-as-promised";
import { Program } from "../../src/entities/program";
import { createProgram } from "../factories/program.factory";
import { Role } from "../../src/entities/role";
import { before } from "mocha";
import { School } from "../../src/entities/school";
import RolesInitializer from "../../src/initializers/roles";
import { convertDataToCursor } from "../utils/paginate";
import { renameDuplicateOrganizationsMutation, renameDuplicateOrganizationsQuery } from "../utils/operations/renameDuplicateOrganizations";
import { IEntityFilter } from "../../src/utils/pagination/filtering";
import { addRoleToOrganizationMembership } from "../utils/operations/organizationMembershipOps";
import { addRoleToSchoolMembership } from "../utils/operations/schoolMembershipOps";

use(chaiAsPromised);

describe("model", () => {
    let connection: Connection;
    let testClient: ApolloServerTestClient;

    before(async () => {
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    after(async () => {
        await connection?.close();
    });

    describe("switchUser", () => {
        let user: User;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when user is not logged in", () => {
            it("raises an error", async () => {
                const fn = () => switchUser(testClient, user.user_id, { authorization: undefined });

                expect(fn()).to.be.rejected;
            });
        });

        context("when user is logged in", () => {
            context("and the user_id is on the account", () => {
                it("returns the expected user", async () => {
                    const gqlRes = await switchUser(testClient, user.user_id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    const gqlUser = gqlRes.data?.switch_user as User
                    const gqlCookies = gqlRes.extensions?.cookies

                    expect(gqlUser.user_id).to.eq(user.user_id)
                    expect(gqlCookies.user_id?.value).to.eq(user.user_id)
                });
            });

            context("and the user_id is on the account", () => {
                let otherUser: User;

                beforeEach(async () => {
                    otherUser = await createUserBilly(testClient);
                });

                it("raises an error", async () => {
                    const fn = () => switchUser(testClient, otherUser.user_id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                    expect(fn()).to.be.rejected;
                });
            });
        });
    });

    describe("getMyUser", () => {
        let user: User;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when user is not logged in", () => {
            context("and the user_id cookie is not provided", () => {
                it("returns null", async () => {
                    const gqlUser = await me(testClient, { authorization: undefined });

                    expect(gqlUser).to.be.null
                });
            });

            context("and the user_id cookie is provided", () => {
                it("returns null", async () => {
                    const gqlUser = await me(testClient, { authorization: undefined }, { user_id: user.user_id });

                    expect(gqlUser).to.be.null
                });
            });
        });

        context("when user is logged in", () => {
            context("and no user_id cookie is provided", () => {
                it("creates and returns the expected user", async () => {
                    const gqlUserWithoutId = await me(testClient, { authorization: getJoeAuthWithoutIdToken() }, { user_id: user.user_id });
                    const gqlUser = await me(testClient, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                    expect(gqlUserWithoutId.user_id).to.eq(gqlUser.user_id)
                });
            });

            context("and the correct user_id cookie is provided", () => {
                it("returns the expected user", async () => {
                    const gqlUser = await me(testClient, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                    expect(gqlUser.user_id).to.eq(user.user_id)
                });
            });

            context("and the incorrect user_id cookie is provided", () => {
                let otherUser: User;

                beforeEach(async () => {
                    otherUser = await createUserBilly(testClient);
                });

                it("returns a user based from the token", async () => {
                    const gqlUser = await me(testClient, { authorization: getJoeAuthToken() }, { user_id: otherUser.user_id });

                    expect(gqlUser).to.not.be.null
                    expect(gqlUser.user_id).to.eq(user.user_id)
                    expect(gqlUser.email).to.eq(user.email)
                });
            });
        });
    });

    describe("myUsers", () => {
        let user: User;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
        });

        context("when user is not logged in", () => {
            it("raises an error", async () => {
                const fn = () => myUsers(testClient, { authorization: undefined });

                expect(fn()).to.be.rejected;
            });
        });

        context("when user is logged in", () => {
            const userInfo = (user: User) => { return user.user_id }

            it("returns the expected users", async () => {
                const gqlUsers = await myUsers(testClient, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                expect(gqlUsers.map(userInfo)).to.deep.eq([user.user_id])
            });
        });
    });

    describe("getOrganizations", () => {
        let user: User;
        let organization: Organization;

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            organization = await createOrganizationAndValidate(testClient, user.user_id);
        });

        context("when user is not logged in", () => {
            it("returns an empty list of organizations", async () => {
                const gqlOrgs = await getAllOrganizations(testClient, { authorization: undefined });

                expect(gqlOrgs).to.be.empty;
            });
        });

        context("when user is logged in", () => {
            const orgInfo = (org: Organization) => { return org.organization_id }
            let otherOrganization: Organization
            let otherUser: User;

            beforeEach(async () => {
                otherUser = await createUserBilly(testClient);
                otherOrganization = await createOrganizationAndValidate(testClient, otherUser.user_id, "Billy's Org");
            });

            context("and the user is not an admin", () => {
                it("raises an error", async () => {
                    const fn = () => getAllOrganizations(testClient, { authorization: getBillyAuthToken() }, { user_id: otherUser.user_id });

                    expect(fn()).to.be.rejected;
                });
            });

            context("and there is no filter in the organization ids", () => {
                it("returns the expected organizations", async () => {
                    const gqlOrgs = await getAllOrganizations(testClient, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                    expect(gqlOrgs.map(orgInfo)).to.deep.eq([
                        organization.organization_id,
                        otherOrganization.organization_id
                    ]);
                });
            });

            context("and there is a filter in the organization ids", () => {
                it("returns the expected organizations", async () => {
                    const gqlOrgs = await getOrganizations(
                        testClient,
                        [organization.organization_id],
                        { authorization: getJoeAuthToken() },
                        { user_id: user.user_id }
                    );

                    expect(gqlOrgs.map(orgInfo)).to.deep.eq([organization.organization_id]);
                });
            });
        });
    });

    describe("getAgeRange", () => {
        let user: User;
        let ageRange: AgeRange;
        let organizationId: string;

        const ageRangeInfo = (ageRange: AgeRange) => {
            return {
                id: ageRange.id,
                name: ageRange.name,
                high_value: ageRange.high_value,
                high_value_unit: ageRange.high_value_unit,
                low_value: ageRange.low_value,
                low_value_unit: ageRange.low_value_unit,
                system: ageRange.system,
            }
        }

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            const org = createOrganization(user)
            await connection.manager.save(org)
            organizationId = org.organization_id
            ageRange = createAgeRange(org)
            await connection.manager.save(ageRange)
        });

        context("when user is not logged in", () => {
            it("returns no age range", async () => {
                const gqlAgeRange = await getAgeRange(testClient, ageRange.id, { authorization: undefined });

                expect(gqlAgeRange).to.be.null;
            });
        });

        context("when user is logged in", () => {
            let otherUserId: string;

            beforeEach(async () => {
                const otherUser = await createUserBilly(testClient);
                otherUserId = otherUser.user_id
            });

            context("and the user is not an admin", () => {
                context("and it belongs to the organization from the age range", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, otherUserId, organizationId, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    });

                    it("returns the expected age range", async () => {
                        const gqlAgeRange = await getAgeRange(testClient, ageRange.id, { authorization: getBillyAuthToken() }, { user_id: otherUserId });

                        expect(gqlAgeRange).not.to.be.null;
                        expect(ageRangeInfo(gqlAgeRange)).to.deep.eq(ageRangeInfo(ageRange))
                    });
                });

                context("and it does not belongs to the organization from the age range", () => {
                    it("returns no age range", async () => {
                        const gqlAgeRange = await getAgeRange(testClient, ageRange.id, { authorization: getBillyAuthToken() }, { user_id: otherUserId });

                        expect(gqlAgeRange).to.be.null;
                    });
                });
            });

            context("and the user is an admin", () => {
                context("and it belongs to the organization from the age range", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, user.user_id, organizationId, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    });

                    it("returns the expected age range", async () => {
                        const gqlAgeRange = await getAgeRange(testClient, ageRange.id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                        expect(gqlAgeRange).not.to.be.null;
                        expect(ageRangeInfo(gqlAgeRange)).to.deep.eq(ageRangeInfo(ageRange))
                    });
                });

                context("and it does not belongs to the organization from the age range", () => {
                    it("returns the expected age range", async () => {
                        const gqlAgeRange = await getAgeRange(testClient, ageRange.id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                        expect(gqlAgeRange).not.to.be.null;
                        expect(ageRangeInfo(gqlAgeRange)).to.deep.eq(ageRangeInfo(ageRange))
                    });
                });
            });
        });
    });

    describe("getGrade", () => {
        let user: User;
        let userId: string;
        let otherUserId: string;
        let organization: Organization;
        let organizationId: string;
        let grade: Grade;

        let gradeDetails: any;

        const gradeInfo = async (grade: Grade) => {
            return {
                name: grade.name,
                progress_from_grade_id: (await grade.progress_from_grade)?.id,
                progress_to_grade_id: (await grade.progress_to_grade)?.id,
                system: grade.system,
            }
        }

        beforeEach(async () => {
            const orgOwner = await createUserJoe(testClient);
            otherUserId = orgOwner.user_id
            user = await createUserBilly(testClient);
            userId = user.user_id
            organization = await createOrganizationAndValidate(testClient, orgOwner.user_id);
            organizationId = organization.organization_id
            const progressFromGrade = createGrade(organization)
            await progressFromGrade.save()
            const progressToGrade = createGrade(organization)
            await progressToGrade.save()
            grade = createGrade(organization, progressFromGrade, progressToGrade)
            await grade.save()
            gradeDetails = await gradeInfo(grade)
        });

        context("when user is not logged in", () => {
            it("returns no age range", async () => {
                const gqlGrade = await getGrade(testClient, grade.id, { authorization: undefined });

                expect(gqlGrade).to.be.null;
            });
        });

        context("when user is logged in", () => {
            context("and the user is not an admin", () => {
                context("and it belongs to the organization from the grade", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, userId, organizationId, { authorization: getJoeAuthToken() }, { user_id: otherUserId });
                    });

                    it("returns the expected grade", async () => {
                        const gqlGrade = await getGrade(testClient, grade.id, { authorization: getBillyAuthToken() }, { user_id: user.user_id });

                        expect(gqlGrade).not.to.be.null;
                        const gqlGradeDetails = await gradeInfo(gqlGrade)
                        expect(gqlGradeDetails).to.deep.eq(gradeDetails)
                    });
                });

                context("and it does not belongs to the organization from the grade", () => {
                    it("returns no grade", async () => {
                        const gqlGrade = await getGrade(testClient, grade.id, { authorization: getBillyAuthToken() }, { user_id: user.user_id });

                        expect(gqlGrade).to.be.null;
                    });
                });
            });

            context("and the user is an admin", () => {
                context("and it belongs to the organization from the grade", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, otherUserId, organizationId, { authorization: getJoeAuthToken() }, { user_id: otherUserId });
                    });

                    it("returns the expected grade", async () => {
                        const gqlGrade = await getGrade(testClient, grade.id, { authorization: getJoeAuthToken() }, { user_id: otherUserId });

                        expect(gqlGrade).not.to.be.null;
                        const gqlGradeDetails = await gradeInfo(gqlGrade)
                        expect(gqlGradeDetails).to.deep.eq(gradeDetails)
                    });
                });

                context("and it does not belongs to the organization from the grade", () => {
                    it("returns the expected grade", async () => {
                        const gqlGrade = await getGrade(testClient, grade.id, { authorization: getJoeAuthToken() }, { user_id: otherUserId });

                        expect(gqlGrade).not.to.be.null;
                        const gqlGradeDetails = await gradeInfo(gqlGrade)
                        expect(gqlGradeDetails).to.deep.eq(gradeDetails)
                    });
                });
            });
        });
    });

    describe("getSubcategory", () => {
        let user: User;
        let subcategory: Subcategory;
        let organizationId: string;

        const subcategoryInfo = (subcategory: Subcategory) => {
            return {
                id: subcategory.id,
                name: subcategory.name,
                system: subcategory.system,
            }
        }

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            const org = createOrganization(user)
            await connection.manager.save(org)
            organizationId = org.organization_id
            subcategory = createSubcategory(org)
            await connection.manager.save(subcategory)
        });

        context("when user is not logged in", () => {
            it("returns no subcategory", async () => {
                const gqlSubcategory = await getSubcategory(testClient, subcategory.id, { authorization: undefined });

                expect(gqlSubcategory).to.be.null;
            });
        });

        context("when user is logged in", () => {
            let otherUserId: string;

            beforeEach(async () => {
                const otherUser = await createUserBilly(testClient);
                otherUserId = otherUser.user_id
            });

            context("and the user is not an admin", () => {
                context("and it belongs to the organization from the subcategory", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, otherUserId, organizationId, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    });

                    it("returns the expected subcategory", async () => {
                        const gqlSubcategory = await getSubcategory(testClient, subcategory.id, { authorization: getBillyAuthToken() }, { user_id: otherUserId });

                        expect(gqlSubcategory).not.to.be.null;
                        expect(subcategoryInfo(gqlSubcategory)).to.deep.eq(subcategoryInfo(subcategory))
                    });
                });

                context("and it does not belongs to the organization from the subcategory", () => {
                    it("returns no subcategory", async () => {
                        const gqlSubcategory = await getSubcategory(testClient, subcategory.id, { authorization: getBillyAuthToken() }, { user_id: user.user_id });

                        expect(gqlSubcategory).to.be.null;
                    });
                });
            });

            context("and the user is an admin", () => {
                context("and it belongs to the organization from the subcategory", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, user.user_id, organizationId, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    });

                    it("returns the expected subcategory", async () => {
                        const gqlSubcategory = await getSubcategory(testClient, subcategory.id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                        expect(gqlSubcategory).not.to.be.null;
                        expect(subcategoryInfo(gqlSubcategory)).to.deep.eq(subcategoryInfo(subcategory))
                    });
                });

                context("and it does not belongs to the organization from the subcategory", () => {
                    it("returns the expected subcategory", async () => {
                        const gqlSubcategory = await getSubcategory(testClient, subcategory.id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                        expect(gqlSubcategory).not.to.be.null;
                        expect(subcategoryInfo(gqlSubcategory)).to.deep.eq(subcategoryInfo(subcategory))
                    });
                });
            });
        });
    });
    describe("getProgram", () => {
        let user: User;
        let program: Program;
        let organizationId: string;

        const programInfo = (program: Program) => {
            return {
                id: program.id,
                name: program.name,
                system: program.system,
            }
        }

        beforeEach(async () => {
            user = await createUserJoe(testClient);
            const org = createOrganization(user)
            await connection.manager.save(org)
            organizationId = org.organization_id
            program = createProgram(org)
            await connection.manager.save(program)
        });

        context("when user is not logged in", () => {
            it("returns no program", async () => {
                const gqlProgram = await getProgram(testClient, program.id, { authorization: undefined });

                expect(gqlProgram).to.be.null;
            });
        });

        context("when user is logged in", () => {
            let otherUserId: string;

            beforeEach(async () => {
                const otherUser = await createUserBilly(testClient);
                otherUserId = otherUser.user_id
            });

            context("and the user is not an admin", () => {
                context("and it belongs to the organization from the program", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, otherUserId, organizationId, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    });

                    it("returns the expected program", async () => {
                        const gqlProgram = await getProgram(testClient, program.id, { authorization: getBillyAuthToken() }, { user_id: otherUserId });

                        expect(gqlProgram).not.to.be.null;
                        expect(programInfo(gqlProgram)).to.deep.eq(programInfo(program))
                    });
                });

                context("and it does not belongs to the organization from the program", () => {
                    it("returns no program", async () => {
                        const gqlProgram = await getProgram(testClient, program.id, { authorization: getBillyAuthToken() }, { user_id: otherUserId });

                        expect(gqlProgram).to.be.null;
                    });
                });
            });

            context("and the user is an admin", () => {
                context("and it belongs to the organization from the program", () => {
                    beforeEach(async () => {
                        await addUserToOrganizationAndValidate(testClient, user.user_id, organizationId, { authorization: getJoeAuthToken() }, { user_id: user.user_id });
                    });

                    it("returns the expected program", async () => {
                        const gqlProgram = await getProgram(testClient, program.id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                        expect(gqlProgram).not.to.be.null;
                        expect(programInfo(gqlProgram)).to.deep.eq(programInfo(program))
                    });
                });

                context("and it does not belongs to the organization from the program", () => {
                    it("returns the expected program", async () => {
                        const gqlProgram = await getProgram(testClient, program.id, { authorization: getJoeAuthToken() }, { user_id: user.user_id });

                        expect(gqlProgram).not.to.be.null;
                        expect(programInfo(gqlProgram)).to.deep.eq(programInfo(program))
                    });
                });
            });
        });
    });

    describe('usersConnection', ()=>{
        let usersList: User [] = [];
        let roleList: Role [] = [];
        const direction = 'FORWARD'
        let organizations: Organization [] = []

        beforeEach(async () => {
            usersList = []
            roleList = []
            const organizations: Organization [] = []
            const schools: School [] = []
            // create two orgs and two schools
            for(let i=0; i<2; i++) {
                const org = createOrganization()
                await connection.manager.save(org);
                organizations.push(org)
                let role = createRole("role "+i,org)
                await connection.manager.save(role)
                roleList.push(role)
                const school = createSchool(org)
                await connection.manager.save(school);
                schools.push(school)
            }
            // create 10 users
            for (let i=0; i<10; i++) {
                usersList.push(createUser())
            }
            //sort users by userId
            await connection.manager.save(usersList)
            // add organizations and schools to users

            for (const user of usersList) {
                for(let i=0; i<2; i++) {
                    await addOrganizationToUserAndValidate(
                        testClient, user.user_id, organizations[i].organization_id, getJoeAuthToken()
                    );
                    await addRoleToOrganizationMembership(testClient,  user.user_id, organizations[i].organization_id, roleList[i].role_id, { authorization: getJoeAuthToken() });
                    await addSchoolToUser(
                        testClient, user.user_id, schools[i].school_id, { authorization: getJoeAuthToken()}
                    );
                     await addRoleToSchoolMembership(testClient, user.user_id, schools[i].school_id,roleList[i].role_id, { authorization: getJoeAuthToken() })

                }
            }
            usersList.sort((a, b) => (a.user_id > b.user_id) ? 1 : -1)
        })
        context('seek forward',  ()=>{
            it('should get the next few records according to pagesize and startcursor', async()=>{
                let directionArgs = { count: 3, cursor:convertDataToCursor(usersList[3].user_id)}
                const usersConnection = await userConnection(testClient, direction, directionArgs, { authorization: getJoeAuthToken() })

                expect(usersConnection?.totalCount).to.eql(10);
                expect(usersConnection?.edges.length).to.equal(3);
                for(let i=0; i<3; i++) {
                    expect(usersConnection?.edges[i].node.id).to.equal(usersList[4+i].user_id)
                    expect(usersConnection?.edges[i].node.organizations.length).to.equal(2)
                    expect(usersConnection?.edges[i].node.schools.length).to.equal(2)
                    expect(usersConnection?.edges[i].node.roles.length).to.equal(4)
                }
                expect(usersConnection?.pageInfo.startCursor).to.equal(convertDataToCursor(usersList[4].user_id))
                expect(usersConnection?.pageInfo.endCursor).to.equal(convertDataToCursor(usersList[6].user_id))
                expect(usersConnection?.pageInfo.hasNextPage).to.be.true
                expect(usersConnection?.pageInfo.hasPreviousPage).to.be.true
            })
        })

        context('organization filter',  ()=>{
            let org: Organization;
            let school1: School;
            let role1: Role;
            beforeEach(async () => {
                //org used to filter
                org = createOrganization()
                await connection.manager.save(org);
                role1 = createRole("role 1",org)
                await connection.manager.save(role1)
                school1 = createSchool(org);


                // org and school whose membership shouldnt be included
                let org2 = createOrganization()
                await connection.manager.save(org2);
                let role2 = createRole("role 2",org2)
                await connection.manager.save(role2)
                const school2 = createSchool(org2);

                await connection.manager.save(school1);
                await connection.manager.save(school2);

                usersList = [];
                // create 10 users
                for (let i=0; i<10; i++) {
                    usersList.push(createUser())
                }
                //sort users by userId
                await connection.manager.save(usersList)

                for (const user of usersList) {
                    await addOrganizationToUserAndValidate(testClient, user.user_id, org.organization_id, getJoeAuthToken());
                    await addRoleToOrganizationMembership(testClient,  user.user_id, org.organization_id, role1.role_id, { authorization: getJoeAuthToken() });
                    await addSchoolToUser(testClient, user.user_id, school1.school_id, { authorization: getJoeAuthToken()})
                    await addRoleToSchoolMembership(testClient, user.user_id, school1.school_id,role1.role_id, { authorization: getJoeAuthToken() })

                    await addOrganizationToUserAndValidate(testClient, user.user_id, org2.organization_id, getJoeAuthToken());
                    await addRoleToOrganizationMembership(testClient,  user.user_id, org2.organization_id, role2.role_id, { authorization: getJoeAuthToken() });
                    await addSchoolToUser(testClient, user.user_id, school2.school_id, { authorization: getJoeAuthToken()})
                    await addRoleToSchoolMembership(testClient, user.user_id, school2.school_id,role2.role_id, { authorization: getJoeAuthToken() })
                }
                usersList.sort((a, b) => (a.user_id > b.user_id) ? 1 : -1)
            })
            it('should filter the pagination results on organization_id', async()=>{
                let directionArgs = {
                    count: 3, cursor:convertDataToCursor(usersList[3].user_id),
                }
                const filter: IEntityFilter = {
                    organizationId: {
                        operator: "eq",
                        value: org.organization_id
                    }
                };
                const usersConnection = await userConnection(
                    testClient, direction, directionArgs,
                    { authorization: getJoeAuthToken() }, filter)

                expect(usersConnection?.totalCount).to.eql(10);
                expect(usersConnection?.edges.length).to.equal(3);
                for(let i=0; i<3; i++) {
                    expect(usersConnection?.edges[i].node.id).to.equal(usersList[4+i].user_id)
                    expect(usersConnection?.edges[i].node.organizations.length).to.equal(1)
                    expect(usersConnection?.edges[i].node.organizations[0].id).to.equal(org.organization_id)
                    expect(usersConnection?.edges[i].node.schools.length).to.equal(1)
                    expect(usersConnection?.edges[i].node.roles.length).to.equal(2)
                    expect(usersConnection?.edges[i].node.schools[0].id).to.equal(school1.school_id)
                    expect(usersConnection?.edges[i].node.roles[0].id).to.equal(role1.role_id)
                }
                expect(usersConnection?.pageInfo.startCursor).to.equal(convertDataToCursor(usersList[4].user_id))
                expect(usersConnection?.pageInfo.endCursor).to.equal(convertDataToCursor(usersList[6].user_id))
                expect(usersConnection?.pageInfo.hasNextPage).to.be.true
                expect(usersConnection?.pageInfo.hasPreviousPage).to.be.true
            })
        })
    })

    describe('permissionsConnection', ()=>{
        let firstPermission: any
        let lastPermission: any

        beforeEach(async () => {
            await RolesInitializer.run()
        })

        context('when seeking forward',  ()=>{
            let user: User;
            const direction = 'FORWARD'

            context('and no direction args are specified', () => {
                beforeEach(async () => {
                    user = await createUserJoe(testClient)
                    await RolesInitializer.run()
                    const permissions = await Permission.find({ take: 50, order: { permission_id: 'ASC' } })
                    firstPermission = permissions[0]
                    lastPermission = permissions.pop()
                })

                it('returns the expected permissions with the default page size', async()=>{
                    const gqlPermissions = await permissionsConnection(testClient, direction, undefined, { authorization: getJoeAuthToken() }, undefined, { user_id: user.user_id })

                    expect(gqlPermissions?.totalCount).to.eql(425);
                    expect(gqlPermissions?.edges.length).to.equal(50);

                    expect(gqlPermissions?.pageInfo.startCursor).to.equal(convertDataToCursor(firstPermission.permission_id))
                    expect(gqlPermissions?.pageInfo.endCursor).to.equal(convertDataToCursor(lastPermission.permission_id))
                    expect(gqlPermissions?.pageInfo.hasNextPage).to.be.true
                    expect(gqlPermissions?.pageInfo.hasPreviousPage).to.be.false
                })
            })

            context('and direction args are specified', () => {
                let directionArgs: any

                beforeEach(async () => {
                    await RolesInitializer.run()
                    const permissions = await Permission.find({ take: 4, order: { permission_id: 'ASC' } })

                    const cursor = convertDataToCursor(permissions[0]?.permission_id || '')
                    directionArgs = { count: 3, cursor: cursor}
                    firstPermission = permissions[1]
                    lastPermission = permissions.pop()
                })

                it('returns the expected permissions with the specified page size', async()=>{
                    const gqlPermissions = await permissionsConnection(testClient, direction, directionArgs, { authorization: getJoeAuthToken() }, undefined, { user_id: user.user_id })

                    expect(gqlPermissions?.totalCount).to.eql(425);
                    expect(gqlPermissions?.edges.length).to.equal(3);

                    expect(gqlPermissions?.pageInfo.startCursor).to.equal(convertDataToCursor(firstPermission.permission_id))
                    expect(gqlPermissions?.pageInfo.endCursor).to.equal(convertDataToCursor(lastPermission.permission_id))
                    expect(gqlPermissions?.pageInfo.hasNextPage).to.be.true
                    expect(gqlPermissions?.pageInfo.hasPreviousPage).to.be.true
                })
            })
            context('and filter args are specified', async () => {
                let filter: IEntityFilter = {
                    permission_id: {
                        operator: "eq",
                        value: "add_content_learning_outcomes_433"
                    }
                }
                let gqlPermissions = await permissionsConnection(testClient, direction, {count: 10}, {authorization: getJoeAuthToken()}, filter);
                expect(gqlPermissions?.totalCount).to.eql(1);

                filter = {
                    permission_id: {
                        operator: "contains",
                        value: "learning"
                    }
                }
                gqlPermissions = await permissionsConnection(testClient, direction, {count: 10}, {authorization: getJoeAuthToken()}, filter);
                expect(gqlPermissions?.totalCount).to.eql(27);
                expect(gqlPermissions?.edges.length).to.equal(10);
            });
        })
    })

    describe("renameDuplicateOrganizations", () => {
        const organizationName = 'Organization 1';

        beforeEach(async () => {
            for (let i = 0; i < 3; i += 1) {
                const organization = new Organization();
                organization.organization_name = organizationName;
                await organization.save();

                const nullOrganization = new Organization();
                await nullOrganization.save();
            }
        });

        context("when operation is not a mutation", () => {
            it("should throw an error", async () => {
                const fn = async () => await renameDuplicateOrganizationsQuery(testClient);
                expect(fn()).to.be.rejected;

                const nullOrgs = await Organization.count({ where: { organization_name: null }});
                const duplicatedOrgs = await Organization.count({ where: { organization_name: organizationName }});
                expect(nullOrgs).eq(3);
                expect(duplicatedOrgs).eq(3);
            });
        });

        context("when user has not Admin permissions", () => {
            it("should throw an error", async () => {
                const fn = async () => await renameDuplicateOrganizationsMutation(testClient);
                expect(fn()).to.be.rejected;

                const nullOrgs = await Organization.count({ where: { organization_name: null }});
                const duplicatedOrgs = await Organization.count({ where: { organization_name: organizationName }});
                expect(nullOrgs).eq(3);
                expect(duplicatedOrgs).eq(3);
            });
        });

        context("when user has Admin permissions", () => {
            it("should throw an error", async () => {
                const result = await renameDuplicateOrganizationsMutation(testClient, getJoeAuthToken());
                expect(result).eq(true);

                const nullOrgs = await Organization.count({ where: { organization_name: null }});
                const duplicatedOrgs = await Organization.count({ where: { organization_name: organizationName }});
                expect(nullOrgs).eq(0);
                expect(duplicatedOrgs).eq(1);
            });
        });
    });
});
