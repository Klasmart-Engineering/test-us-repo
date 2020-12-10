import {
    Column,
    PrimaryGeneratedColumn,
    Check,
    Entity,
    Unique,
    OneToMany,
    getRepository,
    getManager,
    JoinColumn,
    ManyToMany,
    JoinTable,
    ManyToOne,
    BaseEntity
} from 'typeorm';
import { GraphQLResolveInfo } from 'graphql';
import { User } from './user';
import { Class } from './class';
import { SchoolMembership } from './schoolMembership';
import { Organization } from './organization';
import { Context } from '../main';
import { PermissionName } from '../permissions/permissionNames';
import { Status } from "./status";

@Entity()
@Check(`"school_name" <> ''`)
@Unique(["school_name", "organization"])
export class School extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public readonly school_id!: string;

    @Column({nullable: false})
    public school_name!: string

    @Column({type: "enum", enum: Status, default: Status.ACTIVE})
    public status! : Status

    @OneToMany(() => SchoolMembership, membership => membership.school)
    @JoinColumn({name: "user_id", referencedColumnName: "user_id"})
    public memberships?: Promise<SchoolMembership[]>

    public async membership({user_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const membership = await getRepository(SchoolMembership).findOneOrFail({where: {user_id, school_id: this.school_id}})
            return membership
        } catch(e) {
            console.error(e)
        }
    }

    @ManyToOne(() => Organization, organization => organization.schools)
    @JoinColumn()
    public organization?: Promise<Organization>

    @ManyToMany(() => Class, class_ => class_.schools)
    @JoinTable()
    public classes?: Promise<Class[]>

    @Column({ type: 'timestamp', nullable: true})
    public deleted_at?: Date

    public async set({school_name}: any, context: Context, info: GraphQLResolveInfo) {
        try {

            const permisionContext = {
              organization_id: (await this.organization as Organization).organization_id,
              school_ids: [this.school_id]
            }

            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.edit_school_20330
            )

            if(info.operation.operation !== "mutation" || this.status == Status.INACTIVE) { return null }

            if(typeof school_name === "string") { this.school_name = school_name }

            await this.save()

            return this
        } catch(e) {
            console.error(e)
        }
    }

    public async addUser({user_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = {
              organization_id: (await this.organization as Organization).organization_id,
              school_ids: [this.school_id]
            }

            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.edit_school_20330
            )

            if(info.operation.operation !== "mutation" || this.status == Status.INACTIVE) { return null }

            const user = await getRepository(User).findOneOrFail(user_id)
            const membership = new SchoolMembership()
            membership.school_id = this.school_id
            membership.school = Promise.resolve(this)
            membership.user_id = user_id
            membership.user = Promise.resolve(user)

            await getManager().save(membership)
            return membership
        } catch(e) {
            console.error(e)
        }
    }

    public async delete({}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation" || this.status == Status.INACTIVE) { return null }

            const permisionContext = {
              organization_id: (await this.organization as Organization).organization_id,
              school_ids: [this.school_id]
            }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.delete_school_20440
            )

            this.status = Status.INACTIVE
            this.deleted_at = new Date()
            await this.save()

            return true
        } catch(e) {
            console.error(e)
        }
        return false
    }
}
