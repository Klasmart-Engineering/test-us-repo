import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Connection } from 'typeorm'
import { sign } from 'jsonwebtoken'
import { generateToken, getNonAdminAuthToken } from '../../utils/testConfig'
import { createTestConnection } from '../../utils/testConnection'
import { createResponse, createRequest } from 'node-mocks-http'
import { checkIssuerAuthorization, checkToken } from '../../../src/token'

use(chaiAsPromised)

describe('Check Token', () => {
    // don't use the TokenPayload type here
    // because for some tests we want to use deliberately wrong type values
    let payload: { [key: string]: any }

    beforeEach(() => {
        payload = {
            id: 'fcf922e5-25c9-5dce-be9f-987a600c1356',
            email: 'billy@gmail.com',
            given_name: 'Billy',
            family_name: 'Bob',
            name: 'Billy Bob',
            iss: 'calmid-debug',
        }
    })

    context('throw errors when validation fails when', () => {
        it('no token passed in', async () => {
            await expect(checkToken()).to.be.rejectedWith(
                'No authentication token'
            )
        })
        it('malformed token passed in', async () => {
            await expect(checkToken('not_a_token')).to.be.rejectedWith(
                'Malformed authentication token'
            )
        })
        it('issuer has wrong type in token', async () => {
            payload['iss'] = 1

            let token = generateToken(payload)
            await expect(checkToken(token)).to.be.rejectedWith(
                'Malformed authentication token issuer'
            )
        })
        it('missing issuer in token', async () => {
            payload = {}
            let token = generateToken(payload)
            await expect(checkToken(token)).to.be.rejectedWith(
                'Malformed authentication token issuer'
            )
        })
        it('unknown token issuer', async () => {
            payload['iss'] = 'not-allowed-issuer'
            let token = generateToken(payload)
            await expect(checkToken(token)).to.be.rejectedWith(
                'Unknown authentication token issuer'
            )
        })
        it('bad signature', async () => {
            let token = sign(payload, 'the_wrong_secret', {
                expiresIn: '1800s',
            })

            await expect(checkToken(token)).to.be.rejectedWith(
                'invalid signature'
            )
        })
    })

    it('with valid token', async () => {
        let token = generateToken(payload)
        await expect(checkToken(token)).to.eventually.have.deep.include(payload)
    })
})

describe('Issuer Authorization', () => {
    let connection: Connection
    let middlewarePass = false
    let mockRequest: any
    let mockResponse: any
    let nextFunction = () => {
        middlewarePass = true
    }

    before(async () => {
        connection = await createTestConnection()
    })

    after(async () => {
        await connection?.close()
    })

    beforeEach(() => {
        middlewarePass = false
        mockRequest = createRequest()
        mockResponse = createResponse()
    })

    context('when headers are not provided', () => {
        it("should execute 'next()' function", async () => {
            checkIssuerAuthorization(mockRequest, mockResponse, nextFunction)

            expect(middlewarePass).eq(true)
            expect(mockResponse.statusCode).eq(200)
        })
    })

    context("when 'authorization' header is not provided", () => {
        it("should execute 'next()' function", async () => {
            mockRequest.headers = {}

            checkIssuerAuthorization(mockRequest, mockResponse, nextFunction)

            expect(middlewarePass).eq(true)
            expect(mockResponse.statusCode).eq(200)
        })
    })

    context("when 'authorization' header is not valid", () => {
        it("should execute 'next()' function", async () => {
            mockRequest.headers = { authorization: 'abc' }

            checkIssuerAuthorization(mockRequest, mockResponse, nextFunction)

            expect(middlewarePass).eq(true)
            expect(mockResponse.statusCode).eq(200)
        })
    })

    context("when 'authorization' header is not allowed", () => {
        let token: string

        beforeEach(() => {
            const payload = {
                id: 'fcf922e5-25c9-5dce-be9f-987a600c1356',
                email: 'billy@gmail.com',
                given_name: 'Billy',
                family_name: 'Bob',
                name: 'Billy Bob',
                iss: 'not-allowed-issuer',
            }

            token = generateToken(payload)

            console.log(token)
        })

        it('should throw an 401: Unauthorized error', async () => {
            mockRequest.headers = { authorization: token }

            checkIssuerAuthorization(mockRequest, mockResponse, nextFunction)

            expect(middlewarePass).eq(false)
            expect(mockResponse.statusCode).eq(401)
            expect(mockResponse._getData()).to.have.property('message')
            expect(mockResponse._getData().message).eq('User not authorized')
        })
    })

    context("when 'authorization' header is allowed", () => {
        let token: string

        beforeEach(async () => {
            token = getNonAdminAuthToken()
        })

        it("should execute 'next()' function", async () => {
            mockRequest.headers = { authorization: token }

            checkIssuerAuthorization(mockRequest, mockResponse, nextFunction)

            expect(middlewarePass).eq(true)
            expect(mockResponse.statusCode).eq(200)
        })
    })
})
