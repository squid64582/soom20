import { Injectable } from '@nestjs/common';

import { WorkspaceMigrationBuilderAction } from 'src/engine/workspace-manager/workspace-migration-builder/interfaces/workspace-migration-builder-action.interface';

import {
  FieldMetadataEntity,
  FieldMetadataType,
} from 'src/engine-metadata/field-metadata/field-metadata.entity';
import { ObjectMetadataEntity } from 'src/engine-metadata/object-metadata/object-metadata.entity';
import {
  WorkspaceMigrationColumnActionType,
  WorkspaceMigrationEntity,
  WorkspaceMigrationTableAction,
} from 'src/engine-metadata/workspace-migration/workspace-migration.entity';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { WorkspaceMigrationFactory } from 'src/engine-metadata/workspace-migration/workspace-migration.factory';
import { generateMigrationName } from 'src/engine-metadata/workspace-migration/utils/generate-migration-name.util';

export interface FieldMetadataUpdate {
  current: FieldMetadataEntity;
  altered: FieldMetadataEntity;
}

@Injectable()
export class WorkspaceMigrationFieldFactory {
  constructor(
    private readonly workspaceMigrationFactory: WorkspaceMigrationFactory,
  ) {}

  async create(
    originalObjectMetadataCollection: ObjectMetadataEntity[],
    fieldMetadataCollection: FieldMetadataEntity[],
    action:
      | WorkspaceMigrationBuilderAction.CREATE
      | WorkspaceMigrationBuilderAction.DELETE,
  ): Promise<Partial<WorkspaceMigrationEntity>[]>;

  async create(
    originalObjectMetadataCollection: ObjectMetadataEntity[],
    fieldMetadataUpdateCollection: FieldMetadataUpdate[],
    action: WorkspaceMigrationBuilderAction.UPDATE,
  ): Promise<Partial<WorkspaceMigrationEntity>[]>;

  async create(
    originalObjectMetadataCollection: ObjectMetadataEntity[],
    fieldMetadataCollectionOrFieldMetadataUpdateCollection:
      | FieldMetadataEntity[]
      | FieldMetadataUpdate[],
    action: WorkspaceMigrationBuilderAction,
  ): Promise<Partial<WorkspaceMigrationEntity>[]> {
    const originalObjectMetadataMap = originalObjectMetadataCollection.reduce(
      (result, currentObject) => {
        result[currentObject.id] = currentObject;

        return result;
      },
      {} as Record<string, ObjectMetadataEntity>,
    );

    switch (action) {
      case WorkspaceMigrationBuilderAction.CREATE:
        return this.createFieldMigration(
          originalObjectMetadataMap,
          fieldMetadataCollectionOrFieldMetadataUpdateCollection as FieldMetadataEntity[],
        );
      case WorkspaceMigrationBuilderAction.UPDATE:
        return this.updateFieldMigration(
          originalObjectMetadataMap,
          fieldMetadataCollectionOrFieldMetadataUpdateCollection as FieldMetadataUpdate[],
        );
      case WorkspaceMigrationBuilderAction.DELETE:
        return this.deleteFieldMigration(
          originalObjectMetadataMap,
          fieldMetadataCollectionOrFieldMetadataUpdateCollection as FieldMetadataEntity[],
        );
      default:
        return [];
    }
  }

  private async createFieldMigration(
    originalObjectMetadataMap: Record<string, ObjectMetadataEntity>,
    fieldMetadataCollection: FieldMetadataEntity[],
  ): Promise<Partial<WorkspaceMigrationEntity>[]> {
    const workspaceMigrations: Partial<WorkspaceMigrationEntity>[] = [];

    for (const fieldMetadata of fieldMetadataCollection) {
      if (fieldMetadata.type === FieldMetadataType.RELATION) {
        continue;
      }

      const migrations: WorkspaceMigrationTableAction[] = [
        {
          name: computeObjectTargetTable(
            originalObjectMetadataMap[fieldMetadata.objectMetadataId],
          ),
          action: 'alter',
          columns: this.workspaceMigrationFactory.createColumnActions(
            WorkspaceMigrationColumnActionType.CREATE,
            fieldMetadata,
          ),
        },
      ];

      workspaceMigrations.push({
        workspaceId: fieldMetadata.workspaceId,
        name: generateMigrationName(`create-${fieldMetadata.name}`),
        isCustom: false,
        migrations,
      });
    }

    return workspaceMigrations;
  }

  private async updateFieldMigration(
    originalObjectMetadataMap: Record<string, ObjectMetadataEntity>,
    fieldMetadataUpdateCollection: FieldMetadataUpdate[],
  ): Promise<Partial<WorkspaceMigrationEntity>[]> {
    const workspaceMigrations: Partial<WorkspaceMigrationEntity>[] = [];

    for (const fieldMetadataUpdate of fieldMetadataUpdateCollection) {
      // Skip relations, because they're just representation and not real columns
      if (fieldMetadataUpdate.altered.type === FieldMetadataType.RELATION) {
        continue;
      }

      const migrations: WorkspaceMigrationTableAction[] = [
        {
          name: computeObjectTargetTable(
            originalObjectMetadataMap[
              fieldMetadataUpdate.current.objectMetadataId
            ],
          ),
          action: 'alter',
          columns: this.workspaceMigrationFactory.createColumnActions(
            WorkspaceMigrationColumnActionType.ALTER,
            fieldMetadataUpdate.current,
            fieldMetadataUpdate.altered,
          ),
        },
      ];

      workspaceMigrations.push({
        workspaceId: fieldMetadataUpdate.current.workspaceId,
        name: generateMigrationName(
          `update-${fieldMetadataUpdate.altered.name}`,
        ),
        isCustom: false,
        migrations,
      });
    }

    return workspaceMigrations;
  }

  private async deleteFieldMigration(
    originalObjectMetadataMap: Record<string, ObjectMetadataEntity>,
    fieldMetadataCollection: FieldMetadataEntity[],
  ): Promise<Partial<WorkspaceMigrationEntity>[]> {
    const workspaceMigrations: Partial<WorkspaceMigrationEntity>[] = [];

    for (const fieldMetadata of fieldMetadataCollection) {
      // We're skipping relation fields, because they're just representation and not real columns
      if (fieldMetadata.type === FieldMetadataType.RELATION) {
        continue;
      }

      const migrations: WorkspaceMigrationTableAction[] = [
        {
          name: computeObjectTargetTable(
            originalObjectMetadataMap[fieldMetadata.objectMetadataId],
          ),
          action: 'alter',
          columns: [
            {
              action: WorkspaceMigrationColumnActionType.DROP,
              columnName: fieldMetadata.name,
            },
          ],
        },
      ];

      workspaceMigrations.push({
        workspaceId: fieldMetadata.workspaceId,
        name: generateMigrationName(`delete-${fieldMetadata.name}`),
        isCustom: false,
        migrations,
      });
    }

    return workspaceMigrations;
  }
}
