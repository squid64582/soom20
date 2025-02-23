import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { GqlOptionsFactory } from '@nestjs/graphql';

import {
  YogaDriverConfig,
  YogaDriverServerContext,
} from '@graphql-yoga/nestjs';
import { GraphQLSchema, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { GraphQLSchemaWithContext, YogaInitialContext } from 'graphql-yoga';
import * as Sentry from '@sentry/node';

import { TokenService } from 'src/engine/modules/auth/services/token.service';
import { EngineModulesModule } from 'src/engine/modules/engine-modules.module';
import { Workspace } from 'src/engine/modules/workspace/workspace.entity';
import { WorkspaceFactory } from 'src/engine/api/graphql/workspace.factory';
import { ExceptionHandlerService } from 'src/engine/integrations/exception-handler/exception-handler.service';
import { handleExceptionAndConvertToGraphQLError } from 'src/engine/filters/utils/global-exception-handler.util';
import { renderApolloPlayground } from 'src/engine/utils/render-apollo-playground.util';
import { EnvironmentService } from 'src/engine/integrations/environment/environment.service';
import { useExceptionHandler } from 'src/engine/integrations/exception-handler/hooks/use-exception-handler.hook';
import { User } from 'src/engine/modules/user/user.entity';
import { useThrottler } from 'src/engine-graphql-config/hooks/use-throttler';
import { JwtData } from 'src/engine/modules/auth/types/jwt-data.type';
import { useSentryTracing } from 'src/engine/integrations/exception-handler/hooks/use-sentry-tracing';

import { CreateContextFactory } from './factories/create-context.factory';

export interface GraphQLContext extends YogaDriverServerContext<'express'> {
  user?: User;
  workspace?: Workspace;
}

@Injectable()
export class GraphQLConfigService
  implements GqlOptionsFactory<YogaDriverConfig<'express'>>
{
  constructor(
    private readonly createContextFactory: CreateContextFactory,
    private readonly tokenService: TokenService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
    private readonly environmentService: EnvironmentService,
    private readonly moduleRef: ModuleRef,
  ) {}

  createGqlOptions(): YogaDriverConfig {
    const isDebugMode = this.environmentService.get('DEBUG_MODE');
    const plugins = [
      useThrottler({
        ttl: this.environmentService.get('API_RATE_LIMITING_TTL'),
        limit: this.environmentService.get('API_RATE_LIMITING_LIMIT'),
        identifyFn: (context) => {
          return context.user?.id ?? context.req.ip ?? 'anonymous';
        },
      }),
      useExceptionHandler({
        exceptionHandlerService: this.exceptionHandlerService,
      }),
    ];

    if (Sentry.isInitialized()) {
      plugins.push(useSentryTracing());
    }

    const config: YogaDriverConfig = {
      context: (context) => this.createContextFactory.create(context),
      autoSchemaFile: true,
      include: [EngineModulesModule],
      conditionalSchema: async (context) => {
        let user: User | undefined;
        let workspace: Workspace | undefined;

        try {
          if (!this.tokenService.isTokenPresent(context.req)) {
            return new GraphQLSchema({});
          }

          const data = await this.tokenService.validateToken(context.req);

          user = data.user;
          workspace = data.workspace;

          return await this.createSchema(context, data);
        } catch (error) {
          if (error instanceof UnauthorizedException) {
            throw new GraphQLError('Unauthenticated', {
              extensions: {
                code: 'UNAUTHENTICATED',
              },
            });
          }

          if (error instanceof JsonWebTokenError) {
            //mockedUserJWT
            throw new GraphQLError('Unauthenticated', {
              extensions: {
                code: 'UNAUTHENTICATED',
              },
            });
          }

          if (error instanceof TokenExpiredError) {
            throw new GraphQLError('Unauthenticated', {
              extensions: {
                code: 'UNAUTHENTICATED',
              },
            });
          }

          throw handleExceptionAndConvertToGraphQLError(
            error,
            this.exceptionHandlerService,
            user
              ? {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  workspaceId: workspace?.id,
                  workspaceDisplayName: workspace?.displayName,
                }
              : undefined,
          );
        }
      },
      resolvers: { JSON: GraphQLJSON },
      plugins: plugins,
    };

    if (isDebugMode) {
      config.renderGraphiQL = () => {
        return renderApolloPlayground();
      };
    }

    return config;
  }

  async createSchema(
    context: YogaDriverServerContext<'express'> & YogaInitialContext,
    data: JwtData,
  ): Promise<GraphQLSchemaWithContext<YogaDriverServerContext<'express'>>> {
    // Create a new contextId for each request
    const contextId = ContextIdFactory.create();

    // Register the request in the contextId
    this.moduleRef.registerRequestByContextId(context.req, contextId);

    // Resolve the WorkspaceFactory for the contextId
    const workspaceFactory = await this.moduleRef.resolve(
      WorkspaceFactory,
      contextId,
      {
        strict: false,
      },
    );

    return await workspaceFactory.createGraphQLSchema(
      data.workspace.id,
      data.user?.id,
    );
  }
}
