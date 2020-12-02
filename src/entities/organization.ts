import {
    Column,
    PrimaryGeneratedColumn,
    Entity,
    OneToMany,
    getRepository,
    getManager,
    JoinColumn,
    OneToOne,
    ManyToOne,
    BaseEntity,
    EntityManager,
} from 'typeorm';
import { uuid } from 'uuidv4';
import { GraphQLResolveInfo } from 'graphql';
import { OrganizationMembership } from './organizationMembership';
import { ProfileOrganizationMembership } from './profileOrganizationMembership';
import { ProfileSchoolMembership } from './profileSchoolMembership';
import { Role } from './role';
import { User, accountUUID } from './user';
import { UserProfile } from "./userprofile";
import { Class } from './class';
import { School } from './school';
import { organizationAdminRole } from '../permissions/organizationAdmin';
import { schoolAdminRole } from '../permissions/schoolAdmin';
import { parentRole } from '../permissions/parent';
import { studentRole } from '../permissions/student';
import { teacherRole } from '../permissions/teacher';
import { Permission } from './permission';
import { Context } from '../main';
import { PermissionName } from '../permissions/permissionNames';
import { SchoolMembership } from './schoolMembership';
import { Model } from '../model';

@Entity()
export class Organization extends BaseEntity {
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

    public async membership({user_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const membership = await getRepository(OrganizationMembership).findOneOrFail({where: {user_id, organization_id: this.organization_id}})
            return membership
        } catch(e) {
            console.error(e)
        }
    }

    @OneToMany(() => ProfileOrganizationMembership, membership => membership.organization)
    @JoinColumn({name: "user_profile_id", referencedColumnName: "user_profile_id"})
    public profileMemberships?: Promise<ProfileOrganizationMembership[]>

    public async profileMembership({user_profile_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const membership = await getRepository(ProfileOrganizationMembership).findOneOrFail({where: {user_profile_id, organization_id: this.organization_id}})
            return membership
        } catch(e) {
            console.error(e)
        }
    }


    @OneToOne(() => User, user => user.my_organization)
    public owner?: Promise<User>

    @ManyToOne(() => User)
    @JoinColumn()
    public primary_contact?: Promise<User>

    @OneToMany(() => Role, role => role.organization)
    @JoinColumn()
    public roles?: Promise<Role[]>

    @OneToMany(() => School, school => school.organization)
    @JoinColumn()
    public schools?: Promise<School[]>

    @OneToMany(() => Class, class_ => class_.organization)
    @JoinColumn()
    public classes?: Promise<Class[]>

    public async set({
        organization_name,
        address1,
        address2,
        phone,
        shortCode,
    }: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.edit_an_organization_details_5
            )

            if(info.operation.operation !== "mutation") { return null }

            if(typeof organization_name === "string") { this.organization_name = organization_name }
            if(typeof address1 === "string") { this.address1 = address1 }
            if(typeof address2 === "string") { this.address2 = address2 }
            if(typeof phone === "string") { this.phone = phone }
            if(typeof shortCode === "string") { this.shortCode = shortCode }

            await this.save()

            return this
        } catch(e) {
            console.error(e)
        }
    }

    public async membersWithPermission({permission_name, search_query}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const query = getRepository(OrganizationMembership)
                .createQueryBuilder()
                .innerJoin("OrganizationMembership.user","User")
                .innerJoin("OrganizationMembership.roles","Role")
                .innerJoin("Role.permissions","Permission")
                .groupBy("OrganizationMembership.organization_id, Permission.permission_name, OrganizationMembership.user_id, User.given_name, User.family_name")
                .where("OrganizationMembership.organization_id = :organization_id", {organization_id: this.organization_id})
                .andWhere("Permission.permission_name = :permission_name", {permission_name})
                .having("bool_and(Permission.allow) = :allowed", {allowed: true})

            if(search_query) {
                await getManager().query(`SET pg_trgm.word_similarity_threshold = ${Model.SIMILARITY_THRESHOLD}`)

                query
                    .andWhere("concat(User.given_name, ' ', User.family_name) %> :search_query")
                    .addSelect("word_similarity(concat(User.given_name, ' ', User.family_name), :search_query)", "similarity")
                    .orderBy("similarity", "DESC")
                    .setParameter("search_query", search_query)
            }

            const results = await query.getMany()
            return results
        } catch(e) {
            console.error(e)
        }
    }

    public async findMembers({search_query}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.view_users_40110
            )

            await getManager().query(`SET pg_trgm.word_similarity_threshold = ${Model.SIMILARITY_THRESHOLD}`)

            return await getRepository(OrganizationMembership)
                .createQueryBuilder()
                .innerJoin("OrganizationMembership.user", "User")
                .where("OrganizationMembership.organization_id = :organization_id", {organization_id: this.organization_id})
                .andWhere("concat(User.given_name, ' ', User.family_name) %> :search_query")
                .addSelect("word_similarity(concat(User.given_name, ' ', User.family_name), :search_query)", "similarity")
                .orderBy("similarity", "DESC")
                .setParameter("search_query", search_query)
                .getMany();
        } catch(e) {
            console.error(e)
        }
    }

    public async setPrimaryContact({user_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.edit_an_organization_details_5
            )

            if(info.operation.operation !== "mutation") { return null }

            const user = await getRepository(User).findOneOrFail({user_id})
            this.primary_contact = Promise.resolve(user)
            await getManager().save(this)

            return user
        } catch(e) {
            console.error(e)
        }
    }

    public async addUser({user_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.send_invitation_40882
            )

            if(info.operation.operation !== "mutation") { return null }

            const user = await getRepository(User).findOneOrFail(user_id)

            const membership = new OrganizationMembership()
            membership.organization_id = this.organization_id
            membership.organization = Promise.resolve(this)
            membership.user_id = user_id
            membership.user = Promise.resolve(user)
            await membership.save()

            return membership
        } catch(e) {
            console.error(e)
        }
    }

    public async addUserProfile({user_profile_id}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.send_invitation_40882
            )

            if(info.operation.operation !== "mutation") { return null }

            const userProfile = await getRepository(UserProfile).findOneOrFail(user_profile_id)

            const membership = new ProfileOrganizationMembership()
            membership.organization_id = this.organization_id
            membership.organization = Promise.resolve(this)
            membership.user_profile_id = user_profile_id
            membership.user_profile = Promise.resolve(userProfile)
            await membership.save()

            return membership
        } catch(e) {
            console.error(e)
        }
    }
    public async inviteUser({email, given_name, family_name, organization_role_ids, school_ids, school_role_ids}: any, context: Context, info: GraphQLResolveInfo) {
        await context.permissions.rejectIfNotAllowed(this, PermissionName.send_invitation_40882)
        try {
            if(info.operation.operation !== "mutation") { return null }
            const result = await this._setMembership(email, given_name, family_name, organization_role_ids, school_ids, school_role_ids)
            return result
        } catch(e) {
            console.error(e)
        }
    }

    public async editMembership({email, given_name, family_name, organization_role_ids, school_ids, school_role_ids}: any, context: Context, info: GraphQLResolveInfo) {
        await context.permissions.rejectIfNotAllowed(this, PermissionName.edit_users_40330)
        try {
            if(info.operation.operation !== "mutation") { return null }
            const result = await this._setMembership(email, given_name, family_name, organization_role_ids, school_ids, school_role_ids)
            return result
        } catch(e) {
            console.error(e)
        }
    }

    private async getRoleLookup():Promise<(roleId: string)=>Promise<Role>> {
            const role_repo = getRepository(Role)
            const roleLookup = async (role_id: string) => {
                const role = await role_repo.findOneOrFail(role_id)
                const checkOrganization = await role.organization
                if(!checkOrganization || checkOrganization.organization_id !== this.organization_id) {
                    throw new Error(`Can not assign Organization(${checkOrganization?.organization_id}).Role(${role_id}) to membership in Organization(${this.organization_id})`)
                }
                return role
            }
            return roleLookup            
    }

    private async findOrCreateUser(
        email: string,
        given_name?: string,
        family_name?: string,
        ):Promise<User> {
            const user_id = accountUUID(email)
            const user = await getRepository(User).findOne({user_id}) || new User()
            user.email = email
            user.user_id = user_id
            if(given_name !== undefined) { user.given_name = given_name }
            if(family_name !== undefined) { user.family_name = family_name }
            return user
        }

    private async findOrCreateUserProfile(
        user: User
    ): Promise<UserProfile>
    {
        const userProfiles = await getRepository(UserProfile).find({ where: { user_profile_user_id: user.user_id, user_profile_name: "default" } });
        if (userProfiles.length < 1) {
            let defaultProfile = new UserProfile()
            defaultProfile.user_profile_id = uuid()
            defaultProfile.user_profile_name = "default"
            defaultProfile.user_profile_user_id = user.user_id
            return defaultProfile
        }
        return userProfiles[0]     
    }

    private async membershipOrganization(
        user: User,
        organizationRoles: Role[]
         ):Promise<OrganizationMembership>{
            const user_id = user.user_id
            const organization_id = this.organization_id
            const membership = await getRepository(OrganizationMembership).findOne({organization_id, user_id}) || new OrganizationMembership()
            membership.organization_id = this.organization_id
            membership.user_id = user.user_id
            membership.user = Promise.resolve(user)
            membership.organization = Promise.resolve(this)
            membership.roles = Promise.resolve(organizationRoles)
        return membership   
    
    }

    private async profileMembershipOrganization(
        userprofile: UserProfile,
        organizationRoles: Role[]
         ):Promise<ProfileOrganizationMembership>{
            const user_profile_id = userprofile.user_profile_id
            const organization_id = this.organization_id
            const membership = await getRepository(ProfileOrganizationMembership).findOne({organization_id, user_profile_id}) || new ProfileOrganizationMembership()
            membership.organization_id = this.organization_id
            membership.user_profile_id = userprofile.user_profile_id
            membership.user_profile = Promise.resolve(userprofile)
            membership.organization = Promise.resolve(this)
            membership.roles = Promise.resolve(organizationRoles)
        return membership   
    
    }


    private async membershipSchools(
        user: User,
        school_ids: string[] = [],
        schoolRoles: Role[]
        ):Promise<[SchoolMembership[],SchoolMembership[]]>{
            const schoolRepo = getRepository(School)
            const user_id = user.user_id
            const schoolMembershipRepo = getRepository(SchoolMembership)
            const oldSchoolMemberships = await schoolMembershipRepo.find({user_id})
            const schoolMemberships = await Promise.all(school_ids.map(async (school_id) => {
                const school = await schoolRepo.findOneOrFail({school_id})
                const checkOrganization = await school.organization
                if(!checkOrganization || checkOrganization.organization_id !== this.organization_id) {
                    throw new Error(`Can not add Organization(${checkOrganization?.organization_id}).School(${school_id}) to membership in Organization(${this.organization_id})`)
                }
                const schoolMembership = await schoolMembershipRepo.findOne({school_id, user_id}) || new SchoolMembership()
                schoolMembership.user_id = user_id
                schoolMembership.user = Promise.resolve(user)
                schoolMembership.school_id = school_id
                schoolMembership.school = Promise.resolve(school)
                schoolMembership.roles = Promise.resolve(schoolRoles)

                return schoolMembership
            }))
        return [schoolMemberships,oldSchoolMemberships]
    }

    private async profileMembershipSchools(
        userprofile: UserProfile,
        school_ids: string[] = [],
        schoolRoles: Role[]
        ):Promise<[ProfileSchoolMembership[],ProfileSchoolMembership[]]>{
            const schoolRepo = getRepository(School)
            const user_profile_id = userprofile.user_profile_id
            const schoolMembershipRepo = getRepository(ProfileSchoolMembership)
            const oldSchoolMemberships = await schoolMembershipRepo.find({user_profile_id})
            const schoolMemberships = await Promise.all(school_ids.map(async (school_id) => {
                const school = await schoolRepo.findOneOrFail({school_id})
                const checkOrganization = await school.organization
                if(!checkOrganization || checkOrganization.organization_id !== this.organization_id) {
                    throw new Error(`Can not add Organization(${checkOrganization?.organization_id}).School(${school_id}) to membership in Organization(${this.organization_id})`)
                }
                const schoolMembership = await schoolMembershipRepo.findOne({school_id, user_profile_id}) || new ProfileSchoolMembership()
                schoolMembership.user_profile_id = user_profile_id
                schoolMembership.user_profile = Promise.resolve(userprofile)
                schoolMembership.school_id = school_id
                schoolMembership.school = Promise.resolve(school)
                schoolMembership.roles = Promise.resolve(schoolRoles)

                return schoolMembership
            }))
        return [schoolMemberships,oldSchoolMemberships]
    }

    private async _setMembership(
        email: string,
        given_name?: string,
        family_name?: string,
        organization_role_ids: string[] = [],
        school_ids: string[] = [],
        school_role_ids: string[] = []
        ) {
        return getManager().transaction(async (manager) => {
            console.log("_setMembership", email, given_name, family_name, organization_role_ids, school_ids, school_role_ids)
            const roleLookup = await this.getRoleLookup()
            const organizationRoles = await Promise.all(organization_role_ids.map((role_id) => roleLookup(role_id)))
            const schoolRoles = await Promise.all(school_role_ids.map((role_id) => roleLookup(role_id)))
            const user = await this.findOrCreateUser(email,given_name,family_name)
            const membership = await this.membershipOrganization(user,  organizationRoles)
            const [schoolMemberships,oldSchoolMemberships] = await this.membershipSchools(user,school_ids,schoolRoles)
            await manager.remove(oldSchoolMemberships);
            await manager.save([user, membership, ...schoolMemberships])
            const userProfile = await this.findOrCreateUserProfile(user)
            const profileMembership = await this.profileMembershipOrganization(userProfile,  organizationRoles)
            const [profileSchoolMemberships,oldProfileSchoolMemberships] = await this.profileMembershipSchools(userProfile,school_ids,schoolRoles)
            await manager.remove(oldProfileSchoolMemberships);  
            await manager.save([userProfile, profileMembership, ...profileSchoolMemberships])      
            
            return {user, membership, schoolMemberships}
        })

    }


    public async createRole({role_name}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.create_role_with_permissions_30222
            )

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

    public async createClass({class_name}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.create_class_20224
            )

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

    public async createSchool({school_name}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            const permisionContext = { organization_id: this.organization_id }
            await context.permissions.rejectIfNotAllowed(
              permisionContext,
              PermissionName.create_school_20220
            )

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

    public async createDefaultRoles({}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }

            const roles = await this._createDefaultRoles()
            return [...roles.values()].flat()
        } catch(e) {
            console.error(e)
        }
    }

    public async resetDefaultRolesPermissions({}: any, context: Context, info: GraphQLResolveInfo) {
        try {
            if(info.operation.operation !== "mutation") { return null }

            for(const {role_name, permissions} of [
              organizationAdminRole,
              schoolAdminRole,
              parentRole,
              studentRole,
              teacherRole,
            ]) {
                const manager = getManager()
                const roles = await Role.find({
                  where: {
                    organization: this.organization_id,
                    role_name: role_name
                  }
                })

                for(const role of roles){
                  const oldPermissions = await role.permissions || []

                  const permissionEntities = [] as Permission[]
                  for(const permission_name of permissions) {
                    const permission = new Permission()
                    permission.permission_name = permission_name
                    permission.allow = true
                    permission.role = Promise.resolve(role)
                    permissionEntities.push(permission)
                  }

                  await manager.remove(oldPermissions)
                  await manager.save(permissionEntities)
                }
            }

        } catch(e) {
            console.error(e)
        }

        return this.roles
    }

    public async _createDefaultRoles(manager: EntityManager = getManager()) {
        const roles = new Map<string, Role[]>()

        for(const {role_name, permissions} of [
            organizationAdminRole,
            schoolAdminRole,
            parentRole,
            studentRole,
            teacherRole,
        ]) {
            const role = new Role()

            const key = role_name||""
            const value = roles.get(key)
            if(value) { value.push(role) } else { roles.set(key, [role])  }

            role.role_name = role_name
            role.organization = Promise.resolve(this)
            await manager.save(role)
            const permissionEntities = [] as Permission[]
            for(const permission_name of permissions) {
                const permission = new Permission()
                permission.permission_name = permission_name
                permission.allow = true
                permission.role = Promise.resolve(role)
                permissionEntities.push(permission)
            }
            await manager.save(permissionEntities)
        }

        return roles
    }
}
