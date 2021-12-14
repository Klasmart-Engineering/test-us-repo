import { Connection } from 'typeorm'
import {
    CreateEntityRowCallback,
    ProcessEntitiesFromCSVRowsBatchValidation,
} from '../../types/csv/createEntityRowCallback'
import { Upload } from '../../types/upload'
import { readCSVFile, readProcessCSVFileBatchValidation } from './readFile'
import { CustomError, instanceOfCSVError } from '../../types/csv/csvError'
import { UserPermissions } from '../../permissions/userPermissions'
import { CreateEntityHeadersCallback } from '../../types/csv/createEntityHeadersCallback'
import logger from '../../logging'
import { CsvRowValidationSchema } from './validations/types'
import { EntityRow as EntityRowType } from '../../types/csv/entityRow'

export async function createEntityFromCsvWithRollBack(
    connection: Connection,
    file: Upload,
    functionsToSaveEntityFromCsvRow: CreateEntityRowCallback[],
    userPermissions: UserPermissions,
    functionToValidateCSVHeaders?: CreateEntityHeadersCallback,
    isDryRun = false
) {
    const queryRunner = connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
        await readCSVFile(
            queryRunner.manager,
            file,
            functionsToSaveEntityFromCsvRow,
            userPermissions,
            functionToValidateCSVHeaders
        )
        logger.info('Generic Upload CSV File finished')

        if (!isDryRun) {
            await queryRunner.commitTransaction()
        } else {
            await queryRunner.rollbackTransaction()
        }
    } catch (errors) {
        if (isDryRun) {
            logger.error('Errors found when previewing CSV file: %o', errors)
        } else {
            logger.error('Error uploading from CSV file: %o', errors)
        }
        await queryRunner.rollbackTransaction()
        if (
            Array.isArray(errors) &&
            errors.every((err) => instanceOfCSVError(err))
        ) {
            throw new CustomError(errors)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(errors as any)
    } finally {
        await queryRunner.release()
    }
}

// Used for batch validation of a CSV file - replaces legacy row-by-row validation
export async function createEntitiesFromCsvBatchValidation<EntityRowType>(
    connection: Connection,
    file: Upload,
    functionToSaveEntitiesFromCSVRows: ProcessEntitiesFromCSVRowsBatchValidation<EntityRowType>,
    userPermissions: UserPermissions,
    functionToValidateCSVHeaders: CreateEntityHeadersCallback,
    functionToValidateCSVRowEntity: CsvRowValidationSchema<EntityRowType>,
    isDryRun = false
) {
    const queryRunner = connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
        await readProcessCSVFileBatchValidation<EntityRowType>(
            queryRunner.manager,
            file,
            functionToSaveEntitiesFromCSVRows,
            userPermissions,
            functionToValidateCSVHeaders,
            functionToValidateCSVRowEntity
        )
        logger.info('Generic Upload CSV File finished')

        if (!isDryRun) {
            await queryRunner.commitTransaction()
        } else {
            await queryRunner.rollbackTransaction()
        }
    } catch (errors) {
        if (isDryRun) {
            logger.error('Errors found when previewing CSV file: %o', errors)
        } else {
            logger.error('Error uploading from CSV file: %o', errors)
        }
        await queryRunner.rollbackTransaction()
        if (
            Array.isArray(errors) &&
            errors.every((err) => instanceOfCSVError(err))
        ) {
            throw new CustomError(errors)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(errors as any)
    } finally {
        await queryRunner.release()
    }
}
