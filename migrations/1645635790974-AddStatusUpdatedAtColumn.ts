import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStatusUpdatedAtColumn1645635790974
    implements MigrationInterface {
    name = 'AddStatusUpdatedAtColumn1645635790974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "school_membership" ADD "status_updated_at" TIMESTAMP(3)`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ADD "status_updated_at" TIMESTAMP(3)`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."subcategory_status_enum" RENAME TO "subcategory_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "subcategory_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "subcategory" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "subcategory" ALTER COLUMN "status" TYPE "subcategory_status_enum" USING "status"::"text"::"subcategory_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "subcategory" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "subcategory_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "subcategory"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."category_status_enum" RENAME TO "category_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "category_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "status" TYPE "category_status_enum" USING "status"::"text"::"category_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "category_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "category"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."subject_status_enum" RENAME TO "subject_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "subject_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "subject" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "subject" ALTER COLUMN "status" TYPE "subject_status_enum" USING "status"::"text"::"subject_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "subject" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "subject_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "subject"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."permission_status_enum" RENAME TO "permission_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "permission_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "status" TYPE "permission_status_enum" USING "status"::"text"::"permission_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "permission_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "permission"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."role_status_enum" RENAME TO "role_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "role_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "status" TYPE "role_status_enum" USING "status"::"text"::"role_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "role_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "role"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."school_membership_status_enum" RENAME TO "school_membership_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "school_membership_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" ALTER COLUMN "status" TYPE "school_membership_status_enum" USING "status"::"text"::"school_membership_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "school_membership_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "school_membership"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."school_status_enum" RENAME TO "school_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "school_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "school" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "school" ALTER COLUMN "status" TYPE "school_status_enum" USING "status"::"text"::"school_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "school" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "school_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "school"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."program_status_enum" RENAME TO "program_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "program_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "program" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "program" ALTER COLUMN "status" TYPE "program_status_enum" USING "status"::"text"::"program_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "program" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "program_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "program"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."grade_status_enum" RENAME TO "grade_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "grade_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "grade" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "grade" ALTER COLUMN "status" TYPE "grade_status_enum" USING "status"::"text"::"grade_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "grade" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "grade_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "grade"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."class_status_enum" RENAME TO "class_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "class_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "class" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "class" ALTER COLUMN "status" TYPE "class_status_enum" USING "status"::"text"::"class_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "class" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "class_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "class"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."organization_ownership_status_enum" RENAME TO "organization_ownership_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "organization_ownership_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_ownership" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_ownership" ALTER COLUMN "status" TYPE "organization_ownership_status_enum" USING "status"::"text"::"organization_ownership_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_ownership" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(
            `DROP TYPE "organization_ownership_status_enum_old"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "organization_ownership"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."user_status_enum" RENAME TO "user_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "user_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "status" TYPE "user_status_enum" USING "status"::"text"::"user_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "user_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "user"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."organization_membership_status_enum" RENAME TO "organization_membership_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "organization_membership_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ALTER COLUMN "status" TYPE "organization_membership_status_enum" USING "status"::"text"::"organization_membership_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(
            `DROP TYPE "organization_membership_status_enum_old"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "organization_membership"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."branding_image_status_enum" RENAME TO "branding_image_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "branding_image_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "branding_image" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "branding_image" ALTER COLUMN "status" TYPE "branding_image_status_enum" USING "status"::"text"::"branding_image_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "branding_image" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "branding_image_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "branding_image"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."branding_status_enum" RENAME TO "branding_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "branding_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "branding" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "branding" ALTER COLUMN "status" TYPE "branding_status_enum" USING "status"::"text"::"branding_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "branding" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "branding_status_enum_old"`)
        await queryRunner.query(`COMMENT ON COLUMN "branding"."status" IS NULL`)
        await queryRunner.query(
            `ALTER TYPE "public"."organization_status_enum" RENAME TO "organization_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "organization_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "organization" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "organization" ALTER COLUMN "status" TYPE "organization_status_enum" USING "status"::"text"::"organization_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "organization_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "organization"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."age_range_status_enum" RENAME TO "age_range_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "age_range_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "age_range" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "age_range" ALTER COLUMN "status" TYPE "age_range_status_enum" USING "status"::"text"::"age_range_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "age_range" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "age_range_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "age_range"."status" IS NULL`
        )
        await queryRunner.query(
            `ALTER TYPE "public"."attendance_status_enum" RENAME TO "attendance_status_enum_old"`
        )
        await queryRunner.query(
            `CREATE TYPE "attendance_status_enum" AS ENUM('active', 'inactive', 'deleted')`
        )
        await queryRunner.query(
            `ALTER TABLE "attendance" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "attendance" ALTER COLUMN "status" TYPE "attendance_status_enum" USING "status"::"text"::"attendance_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "attendance" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "attendance_status_enum_old"`)
        await queryRunner.query(
            `COMMENT ON COLUMN "attendance"."status" IS NULL`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `COMMENT ON COLUMN "attendance"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "attendance_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "attendance" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "attendance" ALTER COLUMN "status" TYPE "attendance_status_enum_old" USING "status"::"text"::"attendance_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "attendance" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "attendance_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "attendance_status_enum_old" RENAME TO  "attendance_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "age_range"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "age_range_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "age_range" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "age_range" ALTER COLUMN "status" TYPE "age_range_status_enum_old" USING "status"::"text"::"age_range_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "age_range" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "age_range_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "age_range_status_enum_old" RENAME TO  "age_range_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "organization"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "organization_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "organization" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "organization" ALTER COLUMN "status" TYPE "organization_status_enum_old" USING "status"::"text"::"organization_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "organization_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "organization_status_enum_old" RENAME TO  "organization_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "branding"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "branding_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "branding" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "branding" ALTER COLUMN "status" TYPE "branding_status_enum_old" USING "status"::"text"::"branding_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "branding" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "branding_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "branding_status_enum_old" RENAME TO  "branding_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "branding_image"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "branding_image_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "branding_image" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "branding_image" ALTER COLUMN "status" TYPE "branding_image_status_enum_old" USING "status"::"text"::"branding_image_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "branding_image" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "branding_image_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "branding_image_status_enum_old" RENAME TO  "branding_image_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "organization_membership"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "organization_membership_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ALTER COLUMN "status" TYPE "organization_membership_status_enum_old" USING "status"::"text"::"organization_membership_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(
            `DROP TYPE "organization_membership_status_enum"`
        )
        await queryRunner.query(
            `ALTER TYPE "organization_membership_status_enum_old" RENAME TO  "organization_membership_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "user"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "user_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "status" TYPE "user_status_enum_old" USING "status"::"text"::"user_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "user_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "user_status_enum_old" RENAME TO  "user_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "organization_ownership"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "organization_ownership_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_ownership" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_ownership" ALTER COLUMN "status" TYPE "organization_ownership_status_enum_old" USING "status"::"text"::"organization_ownership_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_ownership" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(
            `DROP TYPE "organization_ownership_status_enum"`
        )
        await queryRunner.query(
            `ALTER TYPE "organization_ownership_status_enum_old" RENAME TO  "organization_ownership_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "class"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "class_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "class" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "class" ALTER COLUMN "status" TYPE "class_status_enum_old" USING "status"::"text"::"class_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "class" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "class_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "class_status_enum_old" RENAME TO  "class_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "grade"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "grade_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "grade" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "grade" ALTER COLUMN "status" TYPE "grade_status_enum_old" USING "status"::"text"::"grade_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "grade" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "grade_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "grade_status_enum_old" RENAME TO  "grade_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "program"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "program_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "program" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "program" ALTER COLUMN "status" TYPE "program_status_enum_old" USING "status"::"text"::"program_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "program" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "program_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "program_status_enum_old" RENAME TO  "program_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "school"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "school_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "school" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "school" ALTER COLUMN "status" TYPE "school_status_enum_old" USING "status"::"text"::"school_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "school" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "school_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "school_status_enum_old" RENAME TO  "school_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "school_membership"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "school_membership_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" ALTER COLUMN "status" TYPE "school_membership_status_enum_old" USING "status"::"text"::"school_membership_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "school_membership_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "school_membership_status_enum_old" RENAME TO  "school_membership_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "role"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "role_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "status" TYPE "role_status_enum_old" USING "status"::"text"::"role_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "role" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "role_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "role_status_enum_old" RENAME TO  "role_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "permission"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "permission_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "status" TYPE "permission_status_enum_old" USING "status"::"text"::"permission_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "permission" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "permission_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "permission_status_enum_old" RENAME TO  "permission_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "subject"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "subject_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "subject" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "subject" ALTER COLUMN "status" TYPE "subject_status_enum_old" USING "status"::"text"::"subject_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "subject" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "subject_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "subject_status_enum_old" RENAME TO  "subject_status_enum"`
        )
        await queryRunner.query(`COMMENT ON COLUMN "category"."status" IS NULL`)
        await queryRunner.query(
            `CREATE TYPE "category_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "status" TYPE "category_status_enum_old" USING "status"::"text"::"category_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "category" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "category_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "category_status_enum_old" RENAME TO  "category_status_enum"`
        )
        await queryRunner.query(
            `COMMENT ON COLUMN "subcategory"."status" IS NULL`
        )
        await queryRunner.query(
            `CREATE TYPE "subcategory_status_enum_old" AS ENUM('active', 'inactive')`
        )
        await queryRunner.query(
            `ALTER TABLE "subcategory" ALTER COLUMN "status" DROP DEFAULT`
        )
        await queryRunner.query(
            `ALTER TABLE "subcategory" ALTER COLUMN "status" TYPE "subcategory_status_enum_old" USING "status"::"text"::"subcategory_status_enum_old"`
        )
        await queryRunner.query(
            `ALTER TABLE "subcategory" ALTER COLUMN "status" SET DEFAULT 'active'`
        )
        await queryRunner.query(`DROP TYPE "subcategory_status_enum"`)
        await queryRunner.query(
            `ALTER TYPE "subcategory_status_enum_old" RENAME TO  "subcategory_status_enum"`
        )
        await queryRunner.query(
            `ALTER TABLE "organization_membership" DROP COLUMN "status_updated_at"`
        )
        await queryRunner.query(
            `ALTER TABLE "school_membership" DROP COLUMN "status_updated_at"`
        )
    }
}
