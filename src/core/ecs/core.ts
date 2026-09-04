/**
 * Entity Component System (ECS) Core
 * High-performance sparse-set based ECS for 10k+ entities
 */

import type { EntityId, ComponentType, Component, ECSWorld } from '@apptypes/core';

export class SparseSet {
  private sparse: Map<EntityId, number> = new Map();
  private dense: EntityId[] = [];

  add(entityId: EntityId): void {
    if (!this.sparse.has(entityId)) {
      this.sparse.set(entityId, this.dense.length);
      this.dense.push(entityId);
    }
  }

  remove(entityId: EntityId): void {
    const index = this.sparse.get(entityId);
    if (index === undefined) return;
    const lastEntity = this.dense[this.dense.length - 1];
    this.dense[index] = lastEntity;
    this.sparse.set(lastEntity, index);
    this.dense.pop();
    this.sparse.delete(entityId);
  }

  has(entityId: EntityId): boolean {
    return this.sparse.has(entityId);
  }

  getAll(): readonly EntityId[] {
    return this.dense;
  }

  clear(): void {
    this.sparse.clear();
    this.dense = [];
  }
}

class ComponentStorage {
  private components: Map<ComponentType, Map<EntityId, Component>> = new Map();
  private entityComponents: Map<EntityId, Set<ComponentType>> = new Map();

  set<T extends Component>(entityId: EntityId, component: T): void {
    const type = component.type;
    if (!this.components.has(type)) {
      this.components.set(type, new Map());
    }
    this.components.get(type)!.set(entityId, component);
    if (!this.entityComponents.has(entityId)) {
      this.entityComponents.set(entityId, new Set());
    }
    this.entityComponents.get(entityId)!.add(type);
  }

  get<T extends Component>(entityId: EntityId, type: ComponentType): T | undefined {
    return this.components.get(type)?.get(entityId) as T | undefined;
  }

  remove(entityId: EntityId, type: ComponentType): void {
    this.components.get(type)?.delete(entityId);
    this.entityComponents.get(entityId)?.delete(type);
  }

  has(entityId: EntityId, type: ComponentType): boolean {
    return this.components.get(type)?.has(entityId) ?? false;
  }

  getEntitiesWith(...types: ComponentType[]): EntityId[] {
    if (types.length === 0) return [];
    const firstTypeMap = this.components.get(types[0]);
    if (!firstTypeMap) return [];
    const result: EntityId[] = [];
    for (const [entityId] of firstTypeMap) {
      if (types.every(t => this.has(entityId, t))) {
        result.push(entityId);
      }
    }
    return result;
  }

  getEntityTypes(entityId: EntityId): Set<ComponentType> {
    return this.entityComponents.get(entityId) ?? new Set();
  }

  removeEntity(entityId: EntityId): void {
    const types = this.entityComponents.get(entityId);
    if (types) {
      for (const type of types) {
        this.components.get(type)?.delete(entityId);
      }
      this.entityComponents.delete(entityId);
    }
  }

  clear(): void {
    this.components.clear();
    this.entityComponents.clear();
  }
}

export class World implements ECSWorld {
  private entities: Set<EntityId> = new Set();
  private storage: ComponentStorage = new ComponentStorage();
  private nextId: number = 1;

  createEntity(): EntityId {
    const id = `entity_${this.nextId++}`;
    this.entities.add(id);
    return id;
  }

  destroyEntity(entityId: EntityId): void {
    this.entities.delete(entityId);
    this.storage.removeEntity(entityId);
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    if (!this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }
    this.storage.set(entityId, component);
  }

  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    this.storage.remove(entityId, componentType);
  }

  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined {
    return this.storage.get<T>(entityId, componentType);
  }

  getEntitiesWith(...componentTypes: ComponentType[]): EntityId[] {
    return this.storage.getEntitiesWith(...componentTypes);
  }

  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    return this.storage.has(entityId, componentType);
  }

  entityExists(entityId: EntityId): boolean {
    return this.entities.has(entityId);
  }

  getAllEntities(): readonly EntityId[] {
    return Array.from(this.entities);
  }

  clear(): void {
    this.entities.clear();
    this.storage.clear();
    this.nextId = 1;
  }

  getStats(): { entityCount: number; componentCount: number } {
    let componentCount = 0;
    for (const entityId of this.entities) {
      componentCount += this.storage.getEntityTypes(entityId).size;
    }
    return {
      entityCount: this.entities.size,
      componentCount,
    };
  }
}

export abstract class System {
  protected world: World;
  protected readonly requiredComponents: ComponentType[];
  protected enabled: boolean = true;

  constructor(world: World, requiredComponents: ComponentType[]) {
    this.world = world;
    this.requiredComponents = requiredComponents;
  }

  abstract update(deltaTime: number): void;

  getEntities(): EntityId[] {
    return this.world.getEntitiesWith(...this.requiredComponents);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export class SystemManager {
  private systems: System[] = [];

  addSystem(system: System, _priority = 0): void {
    this.systems.push(system);
  }

  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  update(deltaTime: number): void {
    for (const system of this.systems) {
      if (system.isEnabled()) {
        system.update(deltaTime);
      }
    }
  }

  clear(): void {
    this.systems = [];
  }
}
