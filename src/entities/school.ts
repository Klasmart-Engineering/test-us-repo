import {
    Column,
    PrimaryGeneratedColumn,
    Check,
    Entity,
    OneToMany,
    getRepository,
    getManager,
    In,
    JoinColumn,
    ManyToMany,
    JoinTable,
    ManyToOne,
    BaseEntity,
    EntityManager,
    Index,
} from 'typeorm'
import { GraphQLResolveInfo } from 'graphql'
import { User } from './user'
import { Class } from './class'
import { SchoolMembership } from './schoolMembership'
import { Organization } from './organization'
import { Context } from '../main'
import { PermissionName } from '../permissions/permissionNames'
import { Status } from './status'
import { OrganizationMembership } from './organizationMembership'
import { Program } from './program'
import { Role } from './role'
import { SHORTCODE_DEFAULT_MAXLEN, validateShortCode } from '../utils/shortcode'

@Entity()
@Check(`"school_name" <> ''`)
// @Unique doesn't support conditions, but the functionality can be replicated with @Index
// https://github.com/typeorm/typeorm/issues/7709
@Index(['organization', 'school_name'], {
    unique: true,
    where: `"status" = '${Status.ACTIVE}'`,
})
export class School extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    public readonly school_id!: string

    @Column({ nullable: false })
    public school_name!: string

    @Column({ nullable: true, length: SHORTCODE_DEFAULT_MAXLEN })
    public shortcode?: string

    @Column({ type: 'enum', enum: Status, default: Status.ACTIVE })
    public status!: Status

    @OneToMany(() => SchoolMembership, (membership) => membership.school)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    public memberships?: Promise<SchoolMembership[]>

    @ManyToMany(() => Role, (role) => role.schoolMemberships)
    public roles?: Promise<Role[]>

    public async membership(
        { user_id }: { user_id: string },
        context: Context,
        info: GraphQLResolveInfo
    ) {
        console.info(
            `Unauthenticated endpoint call school membership by ${context.permissions?.getUserId()}`
        )

        try {
            const membership = await getRepository(
                SchoolMembership
            ).findOneOrFail({ where: { user_id, school_id: this.school_id } })
            return membership
        } catch (e) {
            console.error(e)
        }
    }

    @ManyToOne(() => Organization, (organization) => organization.schools)
    @JoinColumn()
    public organization?: Promise<Organization>

    @ManyToMany(() => Class, (class_) => class_.schools)
    @JoinTable()
    public classes?: Promise<Class[]>

    @ManyToMany(() => Program, (program) => program.schools)
    @JoinTable()
    public programs?: Promise<Program[]>

    @Column({ type: 'timestamp', nullable: true })
    public deleted_at?: Date

    public async set(
        { school_name, shortcode }: { school_name: string; shortcode: string },
        context: Context,
        info: GraphQLResolveInfo
    ) {
        if (
            info.operation.operation !== 'mutation' ||
            this.status == Status.INACTIVE
        ) {
            return null
        }

        const permisionContext = {
            organization_id: (await this.organization)?.organization_id,
            school_ids: [this.school_id],
        }
        await context.permissions.rejectIfNotAllowed(
            permisionContext,
            PermissionName.edit_school_20330
        )

        try {
            if (typeof school_name === 'string') {
                this.school_name = school_name
            }
            if (typeof shortcode === 'string') {
                shortcode = shortcode.toUpperCase()
                if (validateShortCode(shortcode)) {
                    this.shortcode = shortcode
                }
            }

            await this.save()

            return this
        } catch (e) {
            console.error(e)
        }
    }

    public async addUser(
        { user_id }: { user_id: string },
        context: Context,
        info: GraphQLResolveInfo
    ) {
        if (
            info.operation.operation !== 'mutation' ||
            this.status == Status.INACTIVE
        ) {
            return null
        }

        const organizationId = (await this.organization)?.organization_id
        const permisionContext = {
            organization_id: organizationId,
            school_ids: [this.school_id],
        }
        await context.permissions.rejectIfNotAllowed(
            permisionContext,
            PermissionName.edit_school_20330
        )

        try {
            const user = await getRepository(User).findOneOrFail(user_id)

            await OrganizationMembership.findOneOrFail({
                where: { organization_id: organizationId, user_id: user_id },
            })

            const membership = new SchoolMembership()
            membership.school_id = this.school_id
            membership.school = Promise.resolve(this)
            membership.user_id = user_id
            membership.user = Promise.resolve(user)

            await getManager().save(membership)
            return membership
        } catch (e) {
            console.error(e)
        }
    }

    public async editPrograms(
        { program_ids }: { program_ids: string[] },
        context: Context,
        info: GraphQLResolveInfo
    ) {
        const organization_id = (await this.organization)?.organization_id
        if (
            info.operation.operation !== 'mutation' ||
            !organization_id ||
            this.status == Status.INACTIVE
        ) {
            return null
        }

        const permisionContext = { organization_id: organization_id }
        await context.permissions.rejectIfNotAllowed(
            permisionContext,
            PermissionName.edit_school_20330
        )

        const validPrograms: Program[] = await this.getPrograms(program_ids)
        this.programs = Promise.resolve(validPrograms)

        await this.save()

        return validPrograms
    }

    private async getPrograms(ids: string[]) {
        if (ids.length === 0) {
            return []
        }

        return await Program.find({
            where: { id: In(ids) },
        })
    }

    public async delete(
        args: Record<string, unknown>,
        context: Context,
        info: GraphQLResolveInfo
    ) {
        if (
            info.operation.operation !== 'mutation' ||
            this.status == Status.INACTIVE
        ) {
            return null
        }

        const permisionContext = {
            organization_id: (await this.organization)?.organization_id,
            school_ids: [this.school_id],
        }
        await context.permissions.rejectIfNotAllowed(
            permisionContext,
            PermissionName.delete_school_20440
        )

        try {
            await getManager().transaction(async (manager) => {
                await this.inactivate(manager)
            })

            return true
        } catch (e) {
            console.error(e)
        }
        return false
    }

    private async inactivateSchoolMemberships(manager: EntityManager) {
        const schoolMemberships = (await this.memberships) || []

        for (const schoolMembership of schoolMemberships) {
            await schoolMembership.inactivate(manager)
        }

        return schoolMemberships
    }

    public async inactivate(manager: EntityManager) {
        this.status = Status.INACTIVE
        this.deleted_at = new Date()

        await this.inactivateSchoolMemberships(manager)
        await manager.save(this)
    }
}
