import prisma from "./prisma";
import { getOrSetCache, invalidateCache } from "./redis";

// ---------------------------------------------------------------------------
// TYPES
// We preserve the `_id` and `ObjectId` type shapes to prevent the frontend
// from breaking, mapping them to Prisma string IDs.
// ---------------------------------------------------------------------------

export interface Institution {
  _id?: string; // Was ObjectId
  id?: string;
  name: string;
  abbr: string;
  type: "Industry" | "Government" | "Academic" | "Others" | string;
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: "Active" | "Inactive" | string;
  createdAt: Date;
}

export interface User {
  _id?: string; // Was ObjectId
  id?: string;
  name?: string | null;
  email?: string | null;
  accessLevel: "admin" | "user" | string;
  institutionId?: string | null;
  logins: number;
  lastLogin?: Date | null;
  assignedDatasets: string[];
}

export interface Dataset {
  _id?: string;
  id?: string;
  datasetId?: string | null;
  name: string;
  description?: string | null;
  institutionId?: string | null;
  // --- ADD THESE TWO LINES ---
  institution?: Institution; 
  study?: any; 
  // ---------------------------
  studyId?: string | null;
  brightfieldBlobUrl?: string | null;
  fluorescentBlobUrl?: string | null;
  spacing?: number | null;
  assignedUsers?: string[];
  createdAt: Date;
  organs: string[];
}

export interface DatasetChildRef {
  datasetId: string;           
  alias?: string | null;              
  order?: number | null;              
}

export interface DatasetMapping {
  _id?: string;
  id?: string;
  parentId: string;            
  children: DatasetChildRef[]; 
  createdAt: Date;
  updatedAt?: Date;
}

// ---------------------------------------------------------------------------
// DATA ACCESS FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Retrieves all institutions from the database.
 */
export async function getInstitutions(): Promise<Institution[]> {
  try {
    return await getOrSetCache('institutions_all', async () => {
      const institutions = await prisma.institution.findMany();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return institutions.map((inst: any) => ({ ...inst, _id: inst.id }));
    });
  } catch (error) {
    throw new Error(`Failed to fetch institutions: ${error}`);
  }
}

/**
 * Retrieves all users from the database.
 */
export async function getUsers(): Promise<User[]> {
  try {
    return await getOrSetCache('users_all', async () => {
      const users = await prisma.user.findMany({
        include: { assignedDatasets: true }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return users.map((user: any) => ({
        ...user,
        _id: user.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignedDatasets: user.assignedDatasets.map((d: any) => d.id)
      }));
    });
  } catch (error) {
    throw new Error(`Failed to fetch users: ${error}`);
  }
}

/**
 * Retrieves all datasets from the database.
 */
export async function getDatasets(): Promise<Dataset[]> {
  try {
    return await getOrSetCache('datasets_all', async () => {
      const datasets = await prisma.dataset.findMany({
        include: { assignedUsers: true }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return datasets.map((dataset: any) => ({
        ...dataset,
        _id: dataset.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignedUsers: dataset.assignedUsers.map((u: any) => u.id)
      }));
    });
  } catch (error) {
    throw new Error(`Failed to fetch datasets: ${error}`);
  }
}

/**
 * Creates a new institution in the database.
 */
export async function createInstitution(institution: Omit<Institution, "_id" | "id" | "createdAt">) {
  try {
    const result = await prisma.institution.create({
      data: institution
    });
    await invalidateCache('institutions_all');
    return { insertedId: result.id };
  } catch (error) {
    throw new Error(`Failed to create institution: ${error}`);
  }
}

/**
 * Updates an existing institution.
 */
export async function updateInstitution(institution: Institution) {
  try {
    const id = institution._id || institution.id;
    if (!id) throw new Error("Institution _id is required for update");
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: _unusedId, id: _droppedId, createdAt: _createdAt, ...updateData } = institution;
    
    await prisma.institution.update({
      where: { id },
      data: updateData
    });
    await invalidateCache('institutions_all');
    return { modifiedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to update institution: ${error}`);
  }
}

/**
 * Creates a new user in the database.
 */
export async function createUser(user: Omit<User, "_id" | "id" | "logins" | "lastLogin" | "assignedDatasets">) {
  try {
    if (user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (existingUser) throw new Error("Email already exists");
    }

    const { institutionId, accessLevel, name, email } = user;
    const result = await prisma.user.create({
      data: {
        name,
        email,
        accessLevel: accessLevel || "user",
        institutionId,
        logins: 0,
      }
    });
    await invalidateCache('users_all');
    return { insertedId: result.id };
  } catch (error) {
    throw new Error(`Failed to create user: ${error}`);
  }
}

/**
 * Updates an existing user in the database.
 */
export async function updateUser(user: User) {
  try {
    const id = user._id || user.id;
    if (!id) throw new Error("User _id is required for update");
    
    if (user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (existingUser && existingUser.id !== id) {
        throw new Error("Email already exists for another user");
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: _unusedId, id: _droppedId, assignedDatasets: _assignedDatasets, ...updateData } = user;
    
    await prisma.user.update({
      where: { id },
      data: updateData
    });
    await invalidateCache('users_all');
    return { modifiedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to update user: ${error}`);
  }
}

/**
 * Updates the login count and last login timestamp for a user by their ID.
 */
export async function updateUserLastLogin(id: string) {
  try {
    await prisma.user.update({
      where: { id },
      data: {
        logins: { increment: 1 },
        lastLogin: new Date()
      }
    });
    await invalidateCache('users_all');
    return { modifiedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to update user login info: ${error}`);
  }
}

/**
 * Updates the assigned datasets for a user by email.
 */
export async function updateUserDatasets(email: string, datasets: string[]) {
  try {
    await prisma.user.update({
      where: { email },
      data: {
        assignedDatasets: {
          set: datasets.map(id => ({ id }))
        }
      }
    });
    await invalidateCache('users_all');
    return { modifiedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to update user datasets: ${error}`);
  }
}

/**
 * Creates a new dataset in the database and updates assigned users.
 */
export async function createDataset(dataset: Omit<Dataset, "_id" | "id" | "createdAt">) {
  try {
    const { assignedUsers, ...restData } = dataset;
    
    const result = await prisma.dataset.create({
      data: {
        ...restData,
        assignedUsers: assignedUsers && assignedUsers.length > 0 
          ? { connect: assignedUsers.map(id => ({ id })) } 
          : undefined
      }
    });

    await invalidateCache('datasets_all');
    await invalidateCache('users_all');
    return { insertedId: result.id };
  } catch (error) {
    throw new Error(`Failed to create dataset: ${error}`);
  }
}

/**
 * Updates an existing dataset.
 */
export async function updateDataset(dataset: Dataset) {
  try {
    const id = dataset._id || dataset.id;
    if (!id) throw new Error("Dataset _id is required for update");
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: _unusedId, id: _droppedId, createdAt: _createdAt, assignedUsers: _assignedUsers, ...updateData } = dataset;
    
    await prisma.dataset.update({
      where: { id },
      data: updateData
    });
    await invalidateCache('datasets_all');
    return { modifiedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to update dataset: ${error}`);
  }
}

/**
 * Deletes a dataset by ID.
 */
export async function deleteDataset(id: string) {
  try {
    await prisma.dataset.delete({ where: { id } });
    await invalidateCache('datasets_all');
    return { deletedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to delete dataset: ${error}`);
  }
}

/**
 * Deletes an institution by ID.
 */
export async function deleteInstitution(id: string) {
  try {
    await prisma.institution.delete({ where: { id } });
    await invalidateCache('institutions_all');
    return { deletedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to delete institution: ${error}`);
  }
}

/**
 * Deletes a user by ID.
 */
export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    await invalidateCache('users_all');
    return { deletedCount: 1 };
  } catch (error) {
    throw new Error(`Failed to delete user: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// DATASET MAPPINGS
// ---------------------------------------------------------------------------

export async function getDatasetMappings(): Promise<DatasetMapping[]> {
  return await getOrSetCache('dataset_mappings_all', async () => {
    const mappings = await prisma.datasetMapping.findMany({
      include: { children: true }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mappings.map((m: any) => ({
      ...m,
      _id: m.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: m.children.map((c: any) => ({
        datasetId: c.datasetId,
        alias: c.alias,
        order: c.order
      }))
    }));
  });
}

export async function getDatasetMappingByParent(parentId: string) {
  return await getOrSetCache(`dataset_mappings_${parentId}`, async () => {
    const mapping = await prisma.datasetMapping.findUnique({
      where: { parentId },
      include: { children: true }
    });
    if (!mapping) return null;
    return {
      ...mapping,
      _id: mapping.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: mapping.children.map((c: any) => ({
        datasetId: c.datasetId,
        alias: c.alias,
        order: c.order
      }))
    };
  });
}

export async function createDatasetMapping(mapping: Omit<DatasetMapping, "_id" | "id" | "createdAt" | "updatedAt">) {
  const existing = await prisma.datasetMapping.findUnique({ where: { parentId: mapping.parentId } });
  if (existing) throw new Error("Mapping already exists for this parent dataset");

  const result = await prisma.datasetMapping.create({
    data: {
      parentId: mapping.parentId,
      children: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: mapping.children.map((c: any) => ({
          datasetId: c.datasetId,
          alias: c.alias,
          order: c.order || 0
        }))
      }
    }
  });

  await invalidateCache('dataset_mappings_all');
  await invalidateCache(`dataset_mappings_${mapping.parentId}`);
  return { insertedId: result.id };
}

export async function updateDatasetMapping(id: string, patch: Partial<DatasetMapping>) {
  // If children are provided, we replace the entire list
  if (patch.children) {
    await prisma.datasetMapping.update({
      where: { id },
      data: {
        children: {
          deleteMany: {}, // Clear existing
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: patch.children.map((c: any) => ({
            datasetId: c.datasetId,
            alias: c.alias,
            order: c.order || 0
          }))
        }
      }
    });
  }

  await invalidateCache('dataset_mappings_all');
  const mapping = await prisma.datasetMapping.findUnique({ where: { id } });
  if (mapping) await invalidateCache(`dataset_mappings_${mapping.parentId}`);

  return { modifiedCount: 1 };
}

export async function deleteDatasetMapping(id: string) {
  const mapping = await prisma.datasetMapping.findUnique({ where: { id } });
  if (mapping) {
    await prisma.datasetMapping.delete({ where: { id } });
    await invalidateCache('dataset_mappings_all');
    await invalidateCache(`dataset_mappings_${mapping.parentId}`);
  }
  return { deletedCount: 1 };
}