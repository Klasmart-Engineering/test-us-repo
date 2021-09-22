# RFC-036 - Custom Program Sharing DB Design

## Synopsis
This RFC explores a DB design to support custom academic profile sharing that is backwards compatible with the current schema.

## Background
Currently, there is a one-to-many relationship between organizations and academic entities, 
i.e. an entity is associated with a single owner organization. 


Academic entities are only visible to members of the organization that created it. 
In order to make entities shareable so that they can be accessed by members of other specified organization,
we need to introduce a new many-to-many relation, in addition to the existing one-to-many relation.


## Implementation

There is a working implementation of this proposal on [this branch](https://bitbucket.org/calmisland/kidsloop-user-service/branch/UD-1126-db-implementation#diff). 

### 1 - Define a AcademicProfileEntity superclass

All academic profile entities will extend a new super class which defines the many-to-many relation
and implements the `share()` and `unshare()` methods. 


```ts
export abstract class AcademicProfileEntity extends BaseEntity {
    @ManyToMany('Organization')
    @JoinTable()
    public shared_with?: Promise<Organization[]>

    public async share(org: Organization): Promise<unknown> {
        // updated shared_with, and cascade to children
    }

    public async unshare(org: Organization) {
        // update shared_with, and figure out unshare logic....
    }
}

@Entity()
export class Category extends AcademicProfileEntity {
    
}
```

### 2 - Update isAdmin queries
`isAdmin` directives can be updated to now include shared orgs. 

- This implementation inadvertently introduces view permission enforcement, which was not done previously. 
   - Tests will therefore break and need to be updated.
- Although we're now doing more work in the isAdmin directive by querying `orgMembershipsWithPermissions(),` it may beneficial overall:
   - That may be queried further down the call stack anyways, at which point it will be cached in memory
   - The entity>shared orgs table is likely to be much smaller than `OrganizationMembership`, so the join would be less expensive



```ts
private nonAdminCategoryScope(
    scope: SelectQueryBuilder<unknown>,
    context: Context
) {
    const orgIds = await context.permissions.orgMembershipsWithPermissions(
        [PermissionName.view_subjects_20115]
    )

    scope
        // join directly on the generated relation table since we just need the org ID
        .leftJoin(
            `category_shared_with_organization`,
            'SharedOrg',
            `SharedOrg.categoryId = Category.id`
        )
        .where(`Category.system = :system`, { system: true })
        .orWhere(
            `(Category.organization IN (:...orgIds) OR "SharedOrg"."organizationOrganizationId" IN (:...orgIds))`,
            { orgIds }
        )
}
```


## Appendix
- [Custom Program Sharing Epic](https://calmisland.atlassian.net/browse/UD-520)
- [Proof of concept](https://bitbucket.org/calmisland/kidsloop-user-service/pull-requests/446)
- [Original RFC](https://calmisland.atlassian.net/wiki/spaces/ATZ/pages/2213642540/RFC-023+Custom+Program+Sharing)

## Decision

|     Reviewer     |  Status  | Color |
|------------------|----------|-------|
| Enrique        | Pending |   🟡  |
| Matthew      | Pending |   🟡  |
| Max  | Approved |   🟡  |
| Richard  | Approved |   🟡 |
| Matt  | Pending  |   🟡  |
| Sam  | Pending  |   🟡  |
| Raphael  | Pending  |   🟡  |
| Marlon  | Pending  |   🟡  |
| Nicholas  | Pending  |   🟡  |
