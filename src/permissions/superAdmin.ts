import { PermissionName } from './permissionNames'

export const superAdminRole = {
    role_name: 'Super Admin',
    permissions: [
        PermissionName.create_an_organization_account_1,
        PermissionName.delete_an_organization_account_2,
        PermissionName.reset_an_organization_account_3,
        PermissionName.setup_an_organizations_academic_profile_4,
        PermissionName.logos_1000,
        PermissionName.live_100,
        PermissionName.go_live_101,
        PermissionName.live_default_interface_170,
        PermissionName.collaboration_show_web_cam_dynamic_174,
        PermissionName.collaboration_show_web_cam_focus_175,
        PermissionName.collaboration_teacher_present_176,
        PermissionName.collaboration_observe_mode_177,
        PermissionName.collaboration_screenshare_mode_178,
        PermissionName.participants_tab_179,
        PermissionName.lesson_plan_tab_180,
        PermissionName.teaches_desk_tab_181,
        PermissionName.settings_tab_182,
        PermissionName.view_lesson_attachments_183,
        PermissionName.attend_live_class_as_a_teacher_186,
        PermissionName.library_200,
        PermissionName.create_content_page_201,
        PermissionName.unpublished_content_page_202,
        PermissionName.pending_content_page_203,
        PermissionName.published_content_page_204,
        PermissionName.archived_content_page_205,
        PermissionName.view_asset_db_300,
        PermissionName.view_my_unpublished_content_210,
        PermissionName.view_my_pending_212,
        PermissionName.view_org_pending_213,
        PermissionName.view_my_published_214,
        PermissionName.view_org_published_215,
        PermissionName.view_my_archived_216,
        PermissionName.view_org_archived_217,
        PermissionName.create_lesson_material_220,
        PermissionName.create_lesson_plan_221,
        PermissionName.copy_content_222,
        PermissionName.edit_my_unpublished_content_230,
        PermissionName.edit_my_published_content_234,
        PermissionName.edit_org_published_content_235,
        PermissionName.edit_lesson_material_metadata_and_content_236,
        PermissionName.edit_lesson_plan_metadata_237,
        PermissionName.edit_lesson_plan_content_238,
        PermissionName.download_lesson_plan_239,
        PermissionName.delete_my_unpublished_content_240,
        PermissionName.library_settings_270,
        PermissionName.approve_pending_content_271,
        PermissionName.reject_pending_content_272,
        PermissionName.archive_published_content_273,
        PermissionName.details_upload_thumbnail_276,
        PermissionName.details_manually_add_program_277,
        PermissionName.details_manually_add_developmental_skill_278,
        PermissionName.details_manually_add_skills_category_279,
        PermissionName.details_manually_add_suitable_age_280,
        PermissionName.details_manually_add_grade_281,
        PermissionName.share_content_282,
        PermissionName.favorite_content_283,
        PermissionName.associate_learning_outcomes_284,
        PermissionName.publish_featured_content_with_lo_285,
        PermissionName.publish_featured_content_no_lo_286,
        PermissionName.publish_free_content_with_lo_287,
        PermissionName.publish_free_content_no_lo_288,
        PermissionName.create_folder_289,
        PermissionName.view_folder_290,
        PermissionName.edit_folder_291,
        PermissionName.delete_folder_292,
        PermissionName.bulk_visibility_settings_293,
        PermissionName.full_content_management_294,
        PermissionName.asset_db_300,
        PermissionName.create_asset_page_301,
        PermissionName.view_asset_310,
        PermissionName.view_live_recordings_311,
        PermissionName.create_asset_320,
        PermissionName.upload_asset_321,
        PermissionName.edit_asset_330,
        PermissionName.download_asset_331,
        PermissionName.delete_asset_340,
        PermissionName.asset_db_settings_380,
        PermissionName.assessments_400,
        PermissionName.create_learning_outcome_page_401,
        PermissionName.unpublished_page_402,
        PermissionName.pending_page_403,
        PermissionName.learning_outcome_page_404,
        PermissionName.milestones_page_405,
        PermissionName.assessments_page_406,
        PermissionName.standards_page_407,
        PermissionName.view_my_unpublished_learning_outcome_410,
        PermissionName.view_org_unpublished_learning_outcome_411,
        PermissionName.view_my_pending_learning_outcome_412,
        PermissionName.view_org_pending_learning_outcome_413,
        PermissionName.view_completed_assessments_414,
        PermissionName.view_in_progress_assessments_415,
        PermissionName.view_published_learning_outcome_416,
        PermissionName.view_unpublished_milestone_417,
        PermissionName.view_published_milestone_418,
        PermissionName.view_unpublished_standard_419,
        PermissionName.view_published_standard_420,
        PermissionName.create_learning_outcome_421,
        PermissionName.create_milestone_422,
        PermissionName.create_standard_423,
        PermissionName.view_my_unpublished_milestone_428,
        PermissionName.view_my_pending_milestone_429,
        PermissionName.edit_my_unpublished_learning_outcome_430,
        PermissionName.remove_content_learning_outcomes_cart_432,
        PermissionName.add_content_learning_outcomes_433,
        PermissionName.edit_my_pending_learning_outcome_434,
        PermissionName.edit_org_pending_learning_outcome_435,
        PermissionName.edit_published_learning_outcome_436,
        PermissionName.edit_unpublished_milestone_440,
        PermissionName.edit_published_milestone_441,
        PermissionName.edit_unpublished_standard_442,
        PermissionName.edit_published_standard_443,
        PermissionName.delete_my_unpublished_learning_outcome_444,
        PermissionName.delete_org_unpublished_learning_outcome_445,
        PermissionName.delete_my_pending_learning_outcome_446,
        PermissionName.delete_org_pending_learning_outcome_447,
        PermissionName.delete_published_learning_outcome_448,
        PermissionName.delete_unpublished_milestone_449,
        PermissionName.delete_published_milestone_450,
        PermissionName.delete_unpublished_standard_451,
        PermissionName.delete_published_standard_452,
        PermissionName.assessment_settings_480,
        PermissionName.approve_pending_learning_outcome_481,
        PermissionName.reject_pending_learning_outcome_482,
        PermissionName.upload_learning_outcomes_483,
        PermissionName.download_learning_outcomes_484,
        PermissionName.add_learning_outcome_to_content_485,
        PermissionName.view_pending_milestone_486,
        PermissionName.edit_my_unpublished_milestone_487,
        PermissionName.delete_my_unpublished_milestone_488,
        PermissionName.delete_org_pending_milestone_489,
        PermissionName.delete_my_pending_milestone_490,
        PermissionName.approve_pending_milestone_491,
        PermissionName.reject_pending_milestone_492,
        PermissionName.schedule_500,
        PermissionName.create_schedule_page_501,
        PermissionName.view_my_calendar_510,
        PermissionName.view_org_calendar_511,
        PermissionName.view_school_calendar_512,
        PermissionName.create_event_520,
        PermissionName.edit_event_530,
        PermissionName.override_live_classroom_recording_setting_531,
        PermissionName.delete_event_540,
        PermissionName.schedule_settings_580,
        PermissionName.schedule_quick_start_581,
        PermissionName.schedule_search_582,
        PermissionName.reports_600,
        PermissionName.org_reports_601,
        PermissionName.school_reports_602,
        PermissionName.teacher_reports_603,
        PermissionName.class_reports_604,
        PermissionName.student_reports_605,
        PermissionName.view_reports_610,
        PermissionName.view_all_organizations_reports_613,
        PermissionName.share_report_630,
        PermissionName.download_report_631,
        PermissionName.report_settings_680,
        PermissionName.organizational_profile_10100,
        PermissionName.view_all_organization_details_page_10101,
        PermissionName.view_this_organization_profile_10110,
        PermissionName.view_my_organization_profile_10111,
        PermissionName.edit_this_organization_10330,
        PermissionName.edit_email_address_10332,
        PermissionName.change_owner_10880,
        PermissionName.join_organization_10881,
        PermissionName.leave_organization_10882,
        PermissionName.academic_profile_20100,
        PermissionName.define_school_program_page_20101,
        PermissionName.define_age_ranges_page_20102,
        PermissionName.define_grade_page_20103,
        PermissionName.define_class_page_20104,
        PermissionName.define_program_page_20105,
        PermissionName.define_subject_page_20106,
        PermissionName.view_school_20110,
        PermissionName.view_program_20111,
        PermissionName.view_age_range_20112,
        PermissionName.view_grades_20113,
        PermissionName.view_classes_20114,
        PermissionName.view_subjects_20115,
        PermissionName.create_school_20220,
        PermissionName.create_program_20221,
        PermissionName.create_age_range_20222,
        PermissionName.create_grade_20223,
        PermissionName.create_class_20224,
        PermissionName.add_students_to_class_20225,
        PermissionName.add_teachers_to_class_20226,
        PermissionName.create_subjects_20227,
        PermissionName.edit_school_20330,
        PermissionName.edit_program_20331,
        PermissionName.edit_age_range_20332,
        PermissionName.edit_grade_20333,
        PermissionName.edit_class_20334,
        PermissionName.move_students_to_another_class_20335,
        PermissionName.edit_teacher_in_class_20336,
        PermissionName.edit_subjects_20337,
        PermissionName.delete_school_20440,
        PermissionName.delete_program_20441,
        PermissionName.delete_age_range_20442,
        PermissionName.delete_grade_20443,
        PermissionName.delete_class_20444,
        PermissionName.delete_student_from_class_roster_20445,
        PermissionName.delete_teacher_from_class_20446,
        PermissionName.delete_subjects_20447,
        PermissionName.upload_schools_20880,
        PermissionName.download_schools_20881,
        PermissionName.upload_program_20882,
        PermissionName.download_program_20883,
        PermissionName.upload_class_roster_with_teachers_20884,
        PermissionName.download_class_roster_with_teachers_20885,
        PermissionName.upload_age_range_20886,
        PermissionName.download_age_range_20887,
        PermissionName.upload_grades_20888,
        PermissionName.download_grades_20889,
        PermissionName.upload_classes_20890,
        PermissionName.download_classes_20891,
        PermissionName.upload_subject_20892,
        PermissionName.download_subject_20893,
        PermissionName.roles_30100,
        PermissionName.roles_and_permissions_30102,
        PermissionName.view_roles_and_permissions_30110,
        PermissionName.create_role_with_permissions_30222,
        PermissionName.edit_role_and_permissions_30332,
        PermissionName.delete_role_30440,
        PermissionName.users_40100,
        PermissionName.view_user_page_40101,
        PermissionName.view_users_40110,
        PermissionName.create_users_40220,
        PermissionName.edit_users_40330,
        PermissionName.delete_users_40440,
        PermissionName.upload_users_40880,
        PermissionName.download_users_40881,
        PermissionName.send_invitation_40882,
        PermissionName.deactivate_user_40883,
        PermissionName.featured_programs_70000,
        PermissionName.view_any_featured_programs_70001,
        PermissionName.view_bada_rhyme_71000,
        PermissionName.view_bada_genius_71001,
        PermissionName.view_bada_talk_71002,
        PermissionName.view_bada_sound_71003,
        PermissionName.view_bada_read_71004,
        PermissionName.view_bada_math_71005,
        PermissionName.view_bada_stem_71006,
        PermissionName.view_badanamu_esl_71007,
        PermissionName.create_bada_rhyme_75000,
        PermissionName.create_bada_genius_75001,
        PermissionName.create_bada_talk_75002,
        PermissionName.create_bada_sound_75003,
        PermissionName.create_bada_read_75004,
        PermissionName.create_bada_math_75005,
        PermissionName.create_bada_stem_75006,
        PermissionName.create_badanamu_esl_75007,
        PermissionName.edit_bada_rhyme_78000,
        PermissionName.edit_bada_genius_78001,
        PermissionName.edit_bada_talk_78002,
        PermissionName.edit_bada_sound_78003,
        PermissionName.edit_bada_read_78004,
        PermissionName.edit_bada_math_78005,
        PermissionName.edit_bada_stem_78006,
        PermissionName.edit_badanamu_esl_78007,
        PermissionName.publish_featured_content_for_all_hub_79000,
        PermissionName.publish_featured_content_for_specific_orgs_79001,
        PermissionName.publish_featured_content_for_all_orgs_79002,
        PermissionName.free_programs_80000,
        PermissionName.view_free_programs_80001,
        PermissionName.view_bada_rhyme_81000,
        PermissionName.view_bada_genius_81001,
        PermissionName.view_bada_talk_81002,
        PermissionName.view_bada_sound_81003,
        PermissionName.view_bada_read_81004,
        PermissionName.view_bada_math_81005,
        PermissionName.view_bada_stem_81006,
        PermissionName.view_badanamu_esl_81007,
        PermissionName.use_free_as_recommended_content_for_study_81008,
        PermissionName.create_bada_rhyme_85000,
        PermissionName.create_bada_genius_85001,
        PermissionName.create_bada_talk_85002,
        PermissionName.create_bada_sound_85003,
        PermissionName.create_bada_read_85004,
        PermissionName.create_bada_math_85005,
        PermissionName.create_bada_stem_85006,
        PermissionName.undefined_85007,
        PermissionName.undefined_85008,
        PermissionName.undefined_85009,
        PermissionName.edit_bada_rhyme_88000,
        PermissionName.edit_bada_genius_88001,
        PermissionName.edit_bada_talk_88002,
        PermissionName.edit_bada_sound_88003,
        PermissionName.edit_bada_read_88004,
        PermissionName.edit_bada_math_88005,
        PermissionName.edit_bada_stem_88006,
        PermissionName.edit_badanamu_esl_88007,
        PermissionName.publish_free_content_for_all_hub_89000,
        PermissionName.publish_free_content_for_specific_orgs_89001,
        PermissionName.publish_free_content_for_all_orgs_89002,
    ],
}
