import { Column, PrimaryGeneratedColumn, Entity, OneToMany, getRepository, getManager, JoinColumn, ManyToMany, JoinTable, OneToOne, ManyToOne } from 'typeorm';
import { GraphQLResolveInfo } from 'graphql';
import { OrganizationMembership } from './organizationMembership';
import { Role } from './role';
import { User } from './user';
import { Class } from './class';
import { School } from './school';

@Entity()
export class Organization {
    @PrimaryGeneratedColumn("uuid")
    public readonly organization_id!: string;
    
    @Column({nullable: true})
    public organization_name?: string
    
    @Column({nullable: true})
    public address1?: string
    
    @Column({nullable: true})
    public address2?: string
    
    @Column({nullable: true})
    public phone?: string
    
    @Column({nullable: true})
    public shortCode?: string

    @OneToMany(() => OrganizationMembership, membership => membership.organization)
    @JoinColumn({name: "user_id", referencedColumnName: "user_id"})
    public memberships?: Promise<OrganizationMembership[]>

    public async membership({user_id}: any, context: any, info: GraphQLResolveInfo) {
        try {
            const membership = await getRepository(OrganizationMembership).findOneOrFail({where: {user_id, organization_id: this.organization_id}})
            return membership
        } catch(e) {
            console.error(e)
        }
    }

    @ManyToOne(() => User)
    @JoinColumn()
    public primary_contact?: Promise<User>
    
    @OneToMany(() => Role, role => role.organization)
    @JoinColumn()
    public roles?: Promise<Role[]>

    public async teachers() { }
    public async students() { }

    @OneToMany(() => School, school => school.organization)
    @JoinColumn()
    public schools?: Promise<School[]>

    @OneToMany(() => Class, class_ => class_.organization)
    @JoinColumn()
    public classes?: Promise<Class[]>

    public async setPrimaryContact({user_id}: any, context: any, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }
            
            const user = await getRepository(User).findOneOrFail({user_id})
            this.primary_contact = Promise.resolve(user)
            await getManager().save(this)
            
            return user
        } catch(e) {
            console.error(e)
        }
    }

    public async addUser({user_id}: any, context: any, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }

            const membership = new OrganizationMembership()
            membership.organization_id = this.organization_id
            membership.organization = Promise.resolve(this)
            membership.user_id = user_id
            membership.user = getRepository(User).findOneOrFail(user_id)

            await getManager().save(membership)
            return membership
        } catch(e) {
            console.error(e)
        }
    }

    public async addRole({role_name}: any, context: any, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }
            const manager = getManager()
            
            const role = new Role()
            role.role_name = role_name
            role.organization = Promise.resolve(this)
            await manager.save(role)
            return role
        } catch(e) {
            console.error(e)
        }
    }

    public async addClass({class_name}: any, context: any, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }
            const manager = getManager()
            
            const _class = new Class()
            _class.class_name = class_name
            _class.organization = Promise.resolve(this)
            await manager.save(_class)

            return _class
        } catch(e) {
            console.error(e)
        }
    }

    public async addSchool({school_name}: any, context: any, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }
            
            const school = new School()
            school.school_name = school_name
            school.organization = Promise.resolve(this)
            await school.save()

            return school
        } catch(e) {
            console.error(e)
        }
    }
}