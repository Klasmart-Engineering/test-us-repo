import faker from 'faker'
import { AgeRange } from '../../src/entities/ageRange'
import { AgeRangeUnit } from '../../src/entities/ageRangeUnit'
import { createOrganization } from './organization.factory'
import { Organization } from '../../src/entities/organization'

export function createAgeRange(
    org: Organization = createOrganization(),
    lowValue?: number,
    highValue?: number,
    system = false
) {
    const ageRange = new AgeRange()
    ageRange.name = faker.random.word()
    // Low value should start with 0 as min but the library has an error with that int value
    // considering it falsey. A bug has been raised to them, until then we need to start at
    // 1
    ageRange.low_value = lowValue || faker.datatype.number({ min: 1, max: 99 })
    ageRange.low_value_unit = faker.random.arrayElement(
        Object.values(AgeRangeUnit)
    )

    ageRange.high_value =
        highValue ||
        faker.datatype.number({
            min: ageRange.low_value,
            max: 99,
        })

    ageRange.high_value_unit = faker.random.arrayElement(
        Object.values(AgeRangeUnit)
    )

    if (!system) ageRange.organization = Promise.resolve(org)
    ageRange.system = system

    return ageRange
}

export const createAgeRanges = (
    length: number,
    org?: Organization,
    lowValue?: number,
    highValue?: number,
    system?: boolean
) =>
    Array(length)
        .fill(undefined)
        .map(() => createAgeRange(org, lowValue, highValue, system))
