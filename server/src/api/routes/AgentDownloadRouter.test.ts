import express = require('express');
import { Application, Response } from 'express';
import { handleErrors } from '../utils/ErrorMiddleware';
import { handleBuildResponseWrapper, handleResponse } from '../utils/ResponseMiddleware';

import * as mongodb from 'mongodb';
import * as request from 'supertest';

import { AgentSchema } from '../domain/Agent';
import { TeamSchema } from '../domain/Team';

import * as AgentDownloadRouter from './AgentDownloadRouter';

import { S3Access } from '../../shared/S3Access';
import { BaseLogger } from '../../shared/SGLogger';

import db from '../../test_helpers/DB';
import {
    CreateAgents,
    CreateSettingsFromTemplate,
    CreateTeamFromTemplate,
    SettingsTemplate,
} from '../../test_helpers/TestArtifacts';
import { ValidationError } from '../utils/Errors';

jest.mock('aws-sdk');
const agentDownloadRouterSingletonMock = jest
    .spyOn(AgentDownloadRouter, 'agentDownloadRouterSingleton')
    .mockReturnValue({});
const agentDownloadRouterMock = jest.spyOn(AgentDownloadRouter, 'agentDownloadRouter').mockReturnValue({});
jest.mock('../../shared/S3Access');

let app: Application;
let InitRouter = () => {
    const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter().router;
    app = express();
    app.use(handleBuildResponseWrapper);
    app.use((req, res, next) => {
        (<any>req).logger = logger;
        next();
    });
    app.use('/api', agentDownloadRouter);
    app.use(handleErrors);
    app.use(handleResponse);
};

const testName = 'AgentDownloadRouter';
let logger;
beforeAll(async () => {
    await db.open();

    logger = new BaseLogger(testName);
    logger.Start();
});

afterAll(async () => {
    await db.close();
});

describe('AgentDownloadRouter', () => {
    let _teamId: mongodb.ObjectId;
    const _userId: mongodb.ObjectId = new mongodb.ObjectId();
    let team: TeamSchema;
    let agents: Array<Partial<AgentSchema>> = [];
    const existingMachineId = 'agent1';
    const newMachineId = 'agent2';
    const invalidAgentVersionMachineId = 'agent3';
    const defaultAgentVersion = SettingsTemplate.filter((t) => t.Type === 'AgentVersion')[0]['Values']['agent'];
    const specificAgentVersion = 'v0.0.2';
    const invalidAgentVersion = 'v0.0.3';

    beforeAll(async () => {
        await CreateSettingsFromTemplate();

        team = await CreateTeamFromTemplate(_userId, { name: 'Test Team 1' }, logger);
        _teamId = team.id;
        agents = [
            {
                _id: new mongodb.ObjectId(),
                machineId: existingMachineId,
                targetVersion: specificAgentVersion,
                reportedVersion: specificAgentVersion,
                ipAddress: 'ipAddress',
            },
            {
                _id: new mongodb.ObjectId(),
                machineId: invalidAgentVersionMachineId,
                targetVersion: invalidAgentVersion,
                reportedVersion: invalidAgentVersion,
                ipAddress: 'ipAddress',
            },
        ];
        await CreateAgents(_teamId, agents);
    });

    describe('AgentDownloadRouter utility functions', () => {
        it('should return the default agent version from the settings collection', async () => {
            const expectedAgentVersion = defaultAgentVersion;
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const testAgentVersion = await agentDownloadRouter.getAgentVersion(_teamId, newMachineId);
            expect(testAgentVersion).toBe(expectedAgentVersion);
        });

        it('should get the s3 path of the agent install', async () => {
            const platform = 'linux';
            const arch = '';
            const agentVersion = defaultAgentVersion;
            const agentVersionMongo = agentVersion.split('.').join('_');
            const expectedAgentS3Path = SettingsTemplate.filter((t) => t.Type === 'AgentBuild')[0]['Values'][
                'agent_install'
            ][agentVersionMongo][platform]['location'];
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const agentBuildKey = `Values.agent_install.${agentVersionMongo}.${platform}${arch}`;
            const testAgentS3Path = await agentDownloadRouter.getAgentS3Path(
                agentBuildKey,
                platform,
                arch,
                logger,
                agentVersionMongo
            );
            expect(testAgentS3Path).toBe(expectedAgentS3Path);
        });

        it('should get the s3 path of the agent launcher install', async () => {
            const platform = 'linux';
            const arch = '';
            const expectedAgentLauncherS3Path = SettingsTemplate.filter((t) => t.Type === 'AgentBuild')[0]['Values'][
                'agent_stub_install'
            ][platform]['location'];
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const agentBuildKey = `Values.agent_stub_install.${platform}${arch}`;
            const testAgentLauncherS3Path = await agentDownloadRouter.getAgentS3Path(
                agentBuildKey,
                platform,
                arch,
                logger
            );
            expect(testAgentLauncherS3Path).toBe(expectedAgentLauncherS3Path);
        });

        it('should throw a validation error if the agent install path is not found in the database', async () => {
            const platform = 'linux';
            const arch = '';
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const invalidAgentVersionMongo = agentDownloadRouter.mongoFormattedAgentVersion(invalidAgentVersion);
            const agentBuildKey = `Values.agent_install.${invalidAgentVersionMongo}.${platform}${arch}`;
            await expect(() =>
                agentDownloadRouter.getAgentS3Path(agentBuildKey, platform, arch, logger, invalidAgentVersionMongo)
            ).rejects.toThrow(ValidationError);
            console.log('done');
        });

        it('should return the agent specific version', async () => {
            const expectedAgentVersion = specificAgentVersion;
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const testAgentVersion = await agentDownloadRouter.getAgentVersion(_teamId, existingMachineId);
            expect(testAgentVersion).toBe(expectedAgentVersion);
        });

        it('should not throw an error for platform=macos, no arch', () => {
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const platform = 'macos';
            const arch = '';
            expect(() => agentDownloadRouter.validateAgentDownloadParameters(platform, arch)).not.toThrowError();
        });

        it('should throw an error for platform=macos, arch=xxx', () => {
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const platform = 'macos';
            const arch = 'xxx';
            expect(() => agentDownloadRouter.validateAgentDownloadParameters(platform, arch)).toThrowError();
        });

        it('should throw an error for platform=xxxxxx, no arch', () => {
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const platform = 'xxxxxx';
            const arch = '';
            expect(() => agentDownloadRouter.validateAgentDownloadParameters(platform, arch)).toThrowError();
        });

        it('should change arch to blank for platform=linux, arch=x64', () => {
            const agentDownloadRouter = new AgentDownloadRouter.AgentDownloadRouter();
            const initialPlatform = 'linux';
            const initialArch = 'x64';
            const { platform, arch } = agentDownloadRouter.validateAgentDownloadParameters(
                initialPlatform,
                initialArch
            );
            expect(platform).toBe(initialPlatform);
            expect(arch).toBe('');
        });
    });

    describe('GET /agent/:machineId/:platform/:arch', () => {
        it('should return a signedurl to download the agent for a valid machineId', async () => {
            const expectedAgentExistsValue: boolean = true;
            const expectedSignedUrl = 'https://s3-signed-url';
            (S3Access as jest.Mock).mockImplementation(() => {
                return {
                    objectExists: () => {
                        return expectedAgentExistsValue;
                    },
                    getSignedS3URL: () => {
                        return expectedSignedUrl;
                    },
                } as unknown as S3Access;
            });

            InitRouter();
            const platform = 'linux';
            const res = await request(app).get(`/api/agent/${existingMachineId}/${platform}`).set('_teamId', _teamId);
            expect(res.status).toBe(200);
            expect(res._body.data).toBe(expectedSignedUrl);
        });

        it('should return a 400 error if agent install details not found in db', async () => {
            const expectedAgentExistsValue: boolean = true;
            const expectedSignedUrl = 'https://s3-signed-url';
            (S3Access as jest.Mock).mockImplementation(() => {
                return {
                    objectExists: () => {
                        return expectedAgentExistsValue;
                    },
                    getSignedS3URL: () => {
                        return expectedSignedUrl;
                    },
                } as unknown as S3Access;
            });

            InitRouter();
            const platform = 'linux';
            const res = await request(app)
                .get(`/api/agent/${invalidAgentVersionMachineId}/${platform}`)
                .set('_teamId', _teamId);
            expect(res.status).toBe(400);
        });

        it('should return a signedurl to download the agent stub', async () => {
            const expectedAgentLauncherExistsValue: boolean = true;
            const expectedSignedUrl = 'https://s3-signed-url';
            (S3Access as jest.Mock).mockImplementation(() => {
                return {
                    objectExists: () => {
                        return expectedAgentLauncherExistsValue;
                    },
                    getSignedS3URL: () => {
                        return expectedSignedUrl;
                    },
                } as unknown as S3Access;
            });

            InitRouter();
            const platform = 'linux';
            const res = await request(app).get(`/api/agentstub/${platform}`);
            expect(res.status).toBe(200);
            expect(res._body.data).toBe(expectedSignedUrl);
        });

        it('should return a 404 error if the agent stub does not exist in s3', async () => {
            const expectedAgentLauncherExistsValue: boolean = false;
            const expectedSignedUrl = 'https://s3-signed-url';
            (S3Access as jest.Mock).mockImplementation(() => {
                return {
                    objectExists: () => {
                        return expectedAgentLauncherExistsValue;
                    },
                    getSignedS3URL: () => {
                        return expectedSignedUrl;
                    },
                } as unknown as S3Access;
            });

            InitRouter();
            const platform = 'linux';
            const res = await request(app).get(`/api/agentstub/${platform}`);
            expect(res.status).toBe(404);
        });

        it('agent download should return a 400 error for an invalid team id', async () => {
            const expectedAgentExistsValue: boolean = true;
            const expectedSignedUrl = 'https://s3-signed-url';
            (S3Access as jest.Mock).mockImplementation(() => {
                return {
                    objectExists: () => {
                        return expectedAgentExistsValue;
                    },
                    getSignedS3URL: () => {
                        return expectedSignedUrl;
                    },
                } as unknown as S3Access;
            });

            InitRouter();
            const platform = 'linux';
            const invalidTeamId: mongodb.ObjectId = new mongodb.ObjectId();
            const res = await request(app)
                .get(`/api/agent/${invalidAgentVersionMachineId}/${platform}`)
                .set('_teamId', invalidTeamId);
            expect(res.status).toBe(400);
        });
    });
});
