import chaiAsPromised from "chai-as-promised";
import { Connection } from "typeorm";
import { expect, use } from "chai";

import { Model } from "../../../../src/model";
import { createServer } from "../../../../src/utils/createServer";
import { ApolloServerTestClient, createTestClient } from "../../../utils/createTestClient";
import { createTestConnection } from "../../../utils/testConnection";
import { Organization } from "../../../../src/entities/organization";
import { Program } from "../../../../src/entities/program";
import { School } from "../../../../src/entities/school";
import { Class } from "../../../../src/entities/class";
import { createOrganization } from "../../../factories/organization.factory";
import { createProgram } from "../../../factories/program.factory";
import { createSchool } from "../../../factories/school.factory";

import { processClassFromCSVRow } from "../../../../src/utils/csv/class";
import { ClassRow } from "../../../../src/types/csv/classRow";

use(chaiAsPromised);

describe("processClassFromCSVRow", ()=> {
    let connection: Connection;
    let testClient: ApolloServerTestClient;
    let row: ClassRow;

    let expectedOrg: Organization
    let expectedProg: Program
    let expectedNoneProg: Program
    let expectedSystemProg: Program
    let expectedSchool: School
    let expectedSchool2: School

    const orgName: string = "my-org";
    const school1Name: string = "test-school";
    const school2Name: string = "test-school2";
    const progName: string = "outdoor activities";
    const systemProgName: string = "Bada Read";
    const noneProgName: string = "None Specified";
    before(async () => {
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    beforeEach(async () => {
        expectedOrg = createOrganization()
        expectedOrg.organization_name = orgName
        await connection.manager.save(expectedOrg)

        expectedProg = createProgram(expectedOrg)
        expectedProg.name = progName
        await connection.manager.save(expectedProg)

        expectedSystemProg = createProgram()
        expectedSystemProg.organization = undefined
        expectedSystemProg.name = systemProgName
        expectedSystemProg.system = true
        await connection.manager.save(expectedSystemProg)

        expectedNoneProg = createProgram()
        expectedNoneProg.organization = undefined
        expectedNoneProg.name = noneProgName
        expectedNoneProg.system = true
        await connection.manager.save(expectedNoneProg)

        expectedSchool = createSchool(expectedOrg, school1Name)
        await connection.manager.save(expectedSchool)

        expectedSchool2 = createSchool(expectedOrg, school2Name)
        await connection.manager.save(expectedSchool2)
    })

    after(async () => {
        await connection?.close();
    });

    
    it('should create a class with school and program when present', async()=>{
        row = {organization_name: orgName, class_name: 'class1', school_name:school1Name, program_name: progName}
        await processClassFromCSVRow(connection.manager, row, 1)

        const dbClass = await Class.findOneOrFail({where:{class_name:"class1", organization:expectedOrg}});
        const schools = await dbClass.schools || []
        const programs = await dbClass.programs || []
        
        expect(schools.length).to.equal(1)
        expect(programs.length).to.equal(1)
    })
    it('should create a class with specified shortcode and system program', async()=>{
        row = {organization_name: orgName, class_name: 'class2', class_shortcode:'3XABK3ZZS1', school_name:school1Name, program_name: systemProgName}
        await processClassFromCSVRow(connection.manager, row, 1)

        const dbClass = await Class.findOneOrFail({where:{class_name:"class2", organization:expectedOrg}});

        const schools = await dbClass.schools || []
        const programs = await dbClass.programs || []
        
        expect(dbClass.shortcode).to.equal("3XABK3ZZS1")
        expect(schools.length).to.equal(1)
        expect(programs.length).to.equal(1)
        expect(programs[0].name).to.equal('Bada Read')
    })
    it('should create a class with no school and none specified program', async()=>{
        row = {organization_name: orgName, class_name: 'class3'}
        await processClassFromCSVRow(connection.manager, row, 1)

        const dbClass = await Class.findOneOrFail({where:{class_name:"class3", organization:expectedOrg}});
        const schools = await dbClass.schools || []
        const programs = await dbClass.programs || []

        expect(schools.length).to.equal(0)
        expect(programs.length).to.equal(1)
        expect(programs[0].name).to.equal(noneProgName)
    })
    it('should create a class with multiple schools and programs', async()=>{
        row = {organization_name: orgName, class_name: 'class4', class_shortcode:'3XABK3ZZS1', school_name:school1Name, program_name: progName}
        await processClassFromCSVRow(connection.manager, row, 1)

        row = {organization_name: orgName, class_name: 'class4', class_shortcode:'3XABK3ZZS1', school_name:school2Name, program_name: systemProgName}
        await processClassFromCSVRow(connection.manager, row, 2)

        const dbClass = await Class.findOneOrFail({where:{class_name:"class4", organization:expectedOrg}});
        const schools = await dbClass.schools || []
        const programs = await dbClass.programs || []
        
        expect(schools.length).to.equal(2)
        expect(programs.length).to.equal(2)
    })

    it('should throw an error (missing org/classname) and rollback when all transactions', async()=>{
        row = {organization_name: '' , class_name: 'class4', class_shortcode:'3XABK3ZZS1', school_name:school1Name, program_name: progName}
        const fn = () => processClassFromCSVRow(connection.manager, row, 1);

        expect(fn()).to.be.rejected
        const dbClass = await Class.find()
        expect(dbClass.length).to.equal(0)
    })

    it('should throw an error for invalid school', async()=>{
        row = {organization_name: orgName , class_name: 'class4', school_name:'some-school', program_name: progName}
        const fn = () => processClassFromCSVRow(connection.manager, row, 1);

        expect(fn()).to.be.rejected

        const dbClass = await Class.find()
        expect(dbClass.length).to.equal(0)
    })

    it('should throw an error for invalid program', async()=>{
        row = {organization_name: orgName , class_name: 'class4', school_name:school1Name, program_name: 'some-prog'}
        const fn = () => processClassFromCSVRow(connection.manager, row, 1);

        expect(fn()).to.be.rejected
        
        const dbClass = await Class.find()
        expect(dbClass.length).to.equal(0)
    })
})