import Joi from 'joi'
import validationConstants from './constants'
import { sharedValidations } from './shared'
import { REGEX } from './regex'

export const userValidations = {
    given_name: sharedValidations.alphanum_with_special_characters
        .required()
        .max(validationConstants.USER_GIVEN_NAME_MAX_LENGTH),

    family_name: sharedValidations.alphanum_with_special_characters
        .required()
        .max(validationConstants.USER_FAMILY_NAME_MAX_LENGTH),

    email: Joi.string()
        .regex(REGEX.email, {
            name: 'email',
        })
        .max(validationConstants.EMAIL_MAX_LENGTH)
        .when('phone', {
            is: undefined,
            then: Joi.optional(),
            otherwise: Joi.required(),
        }),

    phone: Joi.string().allow(null).regex(REGEX.phone, {
        name: 'phone',
    }),

    date_of_birth: Joi.string().allow(null).regex(REGEX.dob, {
        name: 'date_mm_yyy',
    }),

    gender: sharedValidations.alphanum_with_special_characters
        .required()
        .min(validationConstants.GENDER_MIN_LENGTH)
        .max(validationConstants.GENDER_MAX_LENGTH),
}