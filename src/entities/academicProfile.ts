import { BaseEntity, ManyToMany, JoinTable } from 'typeorm'
import { Organization } from './organization'

export abstract class AcademicProfileEntity extends BaseEntity {
    @ManyToMany(() => Organization)
    @JoinTable()
    public shared_with?: Promise<Organization[]>

    public async share(org: Organization): Promise<unknown> {
        const sharedWith = (await this.shared_with) || []
        if (sharedWith.find((o) => o.organization_id === org.organization_id)) {
            // already shared
            return
        }
        sharedWith.push(org)
        this.shared_with = Promise.resolve(sharedWith)
        await this.save()
    }

    public async unshare(org: Organization) {
        const sharedWith = (await this.shared_with) || []

        const orgIndex = sharedWith.findIndex(
            (o) => o.organization_id === org.organization_id
        )
        if (orgIndex >= 0) {
            sharedWith.splice(orgIndex, 1)

            this.shared_with = Promise.resolve(sharedWith)
            await this.save()
        }
    }
}
