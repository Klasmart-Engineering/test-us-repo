import { PermissionName } from './permissionNames'

export const schoolAdminRole = {
    role_name: 'School Admin',
    permissions: [
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
        PermissionName.view_my_published_214,
        PermissionName.view_org_published_215,
        PermissionName.view_my_archived_216,
        PermissionName.view_my_school_published_218,
        PermissionName.copy_content_222,
        PermissionName.create_my_schools_content_223,
        PermissionName.view_my_school_pending_225,
        PermissionName.view_my_school_archived_226,
        PermissionName.edit_my_unpublished_content_230,
        PermissionName.edit_my_published_content_234,
        PermissionName.delete_my_unpublished_content_240,
        PermissionName.delete_my_schools_pending_241,
        PermissionName.remove_my_schools_published_242,
        PermissionName.delete_my_schools_archived_243,
        PermissionName.edit_my_schools_published_247,
        PermissionName.delete_my_pending_251,
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
        PermissionName.view_folder_290,
        PermissionName.asset_db_300,
        PermissionName.create_asset_page_301,
        PermissionName.view_asset_310,
        PermissionName.view_live_recordings_311,
        PermissionName.create_asset_320,
        PermissionName.upload_asset_321,
        PermissionName.edit_asset_330,
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
        PermissionName.view_my_pending_learning_outcome_412,
        PermissionName.view_org_pending_learning_outcome_413,
        PermissionName.view_completed_assessments_414,
        PermissionName.view_in_progress_assessments_415,
        PermissionName.view_published_learning_outcome_416,
        PermissionName.view_unpublished_milestone_417,
        PermissionName.view_published_milestone_418,
        PermissionName.view_published_standard_420,
        PermissionName.create_learning_outcome_421,
        PermissionName.create_milestone_422,
        PermissionName.view_school_completed_assessments_426,
        PermissionName.view_school_in_progress_assessments_427,
        PermissionName.view_my_unpublished_milestone_428,
        PermissionName.view_my_pending_milestone_429,
        PermissionName.edit_my_unpublished_learning_outcome_430,
        PermissionName.remove_content_learning_outcomes_cart_432,
        PermissionName.add_content_learning_outcomes_433,
        PermissionName.edit_attendance_for_in_progress_assessment_438,
        PermissionName.edit_in_progress_assessment_439,
        PermissionName.delete_my_unpublished_learning_outcome_444,
        PermissionName.delete_my_pending_learning_outcome_446,
        PermissionName.approve_pending_learning_outcome_481,
        PermissionName.reject_pending_learning_outcome_482,
        PermissionName.add_learning_outcome_to_content_485,
        PermissionName.view_pending_milestone_486,
        PermissionName.edit_my_unpublished_milestone_487,
        PermissionName.delete_my_unpublished_milestone_488,
        PermissionName.delete_my_pending_milestone_490,
        PermissionName.approve_pending_milestone_491,
        PermissionName.reject_pending_milestone_492,
        PermissionName.schedule_500,
        PermissionName.create_schedule_page_501,
        PermissionName.view_my_calendar_510,
        PermissionName.view_school_calendar_512,
        PermissionName.view_review_calendar_events_513,
        PermissionName.create_my_schools_schedule_events_522,
        PermissionName.create_review_calendar_events_523,
        PermissionName.create_live_calendar_events_524,
        PermissionName.create_class_calendar_events_525,
        PermissionName.create_study_calendar_events_526,
        PermissionName.create_home_fun_calendar_events_527,
        PermissionName.edit_event_530,
        PermissionName.delete_event_540,
        PermissionName.schedule_settings_580,
        PermissionName.schedule_quick_start_581,
        PermissionName.schedule_search_582,
        PermissionName.reports_600,
        PermissionName.view_my_school_reports_611,
        PermissionName.report_student_achievement_615,
        PermissionName.report_learning_outcomes_in_categories_616,
        PermissionName.school_reports_602,
        PermissionName.teacher_reports_603,
        PermissionName.class_reports_604,
        PermissionName.student_reports_605,
        PermissionName.report_school_teaching_load_618,
        PermissionName.teachers_classes_teaching_time_report_620,
        PermissionName.class_load_time_report_621,
        PermissionName.time_assessing_load_report_622,
        PermissionName.a_teachers_detailed_time_load_report_623,
        PermissionName.a_teachers_schedule_load_report_624,
        PermissionName.a_teachers_detailed_schedule_load_report_625,
        PermissionName.organization_class_achievements_report_626,
        PermissionName.school_class_achievements_report_627,
        PermissionName.my_student_achievements_report_629,
        PermissionName.share_report_630,
        PermissionName.download_report_631,
        PermissionName.report_schools_skills_taught_641,
        PermissionName.skills_taught_by_all_teachers_in_my_school_report_644,
        PermissionName.report_schools_class_achievements_647,
        PermissionName.report_learning_summary_school_651,
        PermissionName.learning_summary_report_653,
        PermissionName.report_school_student_usage_655,
        PermissionName.student_usage_report_657,
        PermissionName.report_student_progress_school_659,
        PermissionName.student_progress_report_662,
        PermissionName.report_settings_680,
        PermissionName.view_my_organization_profile_10111,
        PermissionName.join_organization_10881,
        PermissionName.leave_organization_10882,
        PermissionName.academic_profile_20100,
        PermissionName.define_school_program_page_20101,
        PermissionName.define_age_ranges_page_20102,
        PermissionName.define_grade_page_20103,
        PermissionName.define_class_page_20104,
        PermissionName.define_program_page_20105,
        PermissionName.define_subject_page_20106,
        PermissionName.view_program_20111,
        PermissionName.view_age_range_20112,
        PermissionName.view_grades_20113,
        PermissionName.view_subjects_20115,
        PermissionName.view_class_roster_20116,
        PermissionName.view_school_classes_20117,
        PermissionName.view_my_school_20119,
        PermissionName.create_program_20221,
        PermissionName.create_age_range_20222,
        PermissionName.create_class_20224,
        PermissionName.add_students_to_class_20225,
        PermissionName.add_teachers_to_class_20226,
        PermissionName.create_school_classes_20228,
        PermissionName.edit_school_20330,
        PermissionName.edit_program_20331,
        PermissionName.edit_age_range_20332,
        PermissionName.edit_class_20334,
        PermissionName.move_students_to_another_class_20335,
        PermissionName.edit_teacher_in_class_20336,
        PermissionName.edit_students_in_class_20338,
        PermissionName.edit_school_class_20339,
        PermissionName.delete_student_from_class_roster_20445,
        PermissionName.delete_teacher_from_class_20446,
        PermissionName.delete_school_class_20448,
        PermissionName.users_40100,
        PermissionName.view_user_page_40101,
        PermissionName.view_my_school_users_40111,
        PermissionName.create_my_school_users_40221,
        PermissionName.edit_my_school_users_40331,
        PermissionName.delete_my_school_users_40441,
        PermissionName.send_invitation_40882,
        PermissionName.deactivate_my_school_user_40885,
        PermissionName.reactivate_my_school_user_40886,
        PermissionName.view_any_featured_programs_70001,
        PermissionName.view_bada_rhyme_71000,
        PermissionName.view_bada_genius_71001,
        PermissionName.view_bada_talk_71002,
        PermissionName.view_bada_sound_71003,
        PermissionName.view_bada_read_71004,
        PermissionName.view_bada_math_71005,
        PermissionName.view_bada_stem_71006,
        PermissionName.view_badanamu_esl_71007,
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
    ],
}
