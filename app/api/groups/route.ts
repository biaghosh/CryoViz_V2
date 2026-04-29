import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface Group {
  _id?: string;
  name: string;
  datasetId: string;
  user: string;
  createdAt: Date;
  updatedAt?: Date;
  description?: string;
  annotationCount?: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const datasetId = req.nextUrl.searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    const groups = await prisma.group.findMany({
      where: { datasetId, userEmail },
      orderBy: { createdAt: 'desc' },
    });

    if (!groups || groups.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedGroups = groups.map((group: any) => ({
      ...group,
      _id: group.id,
      user: group.userEmail,
      annotationCount: 0, // Will be calculated by frontend
    }));

    return NextResponse.json(formattedGroups, { status: 200 });
  } catch (error) {
    console.error("Error fetching groups:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to fetch groups: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Check if user exists via email link
    const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!userObj) {
      return NextResponse.json({ error: "User account not linked" }, { status: 401 });
    }

    const groupData: Omit<Group, "_id" | "user" | "createdAt"> = await req.json();

    if (!groupData.name || typeof groupData.name !== "string" || groupData.name.trim() === "") {
      return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 });
    }

    if (!groupData.datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    const existingGroup = await prisma.group.findUnique({
      where: {
        name_datasetId_userEmail: {
          name: groupData.name.trim(),
          datasetId: groupData.datasetId,
          userEmail: userEmail
        }
      }
    });

    if (existingGroup) {
      return NextResponse.json({ error: "Group with this name already exists" }, { status: 409 });
    }

    const result = await prisma.group.create({
      data: {
        name: groupData.name.trim(),
        datasetId: groupData.datasetId,
        userEmail: userEmail,
        description: groupData.description,
      }
    });

    return NextResponse.json({
      _id: result.id,
      name: result.name,
      datasetId: result.datasetId,
      user: result.userEmail,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      description: result.description,
      annotationCount: 0
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to create group: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { _id, name, description } = await req.json();

    if (!_id) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 });
    }

    const existingGroup = await prisma.group.findFirst({
      where: { id: _id, userEmail }
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found or access denied" }, { status: 404 });
    }

    const result = await prisma.group.update({
      where: { id: _id },
      data: {
        name: name.trim(),
        description: description,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Group updated successfully",
      _id,
      name: name.trim(),
      description,
      updatedAt: result.updatedAt
    });
  } catch (error) {
    console.error("Error updating group:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to update group: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { _id, datasetId } = await req.json();

    if (!_id || !datasetId) {
      return NextResponse.json({ error: "Group ID and Dataset ID are required" }, { status: 400 });
    }

    // First, check if there are any annotations in this group
    const group = await prisma.group.findUnique({ where: { id: _id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found or access denied" }, { status: 404 });
    }
    
    if (group.userEmail !== userEmail) {
      return NextResponse.json({ error: "Group not found or access denied" }, { status: 404 });
    }

    const annotationCount = await prisma.annotation.count({
      where: {
        groupName: group.name,
        datasetId,
        userEmail
      }
    });

    if (annotationCount > 0) {
      return NextResponse.json({
        error: "Cannot delete group with existing annotations. Please reassign or delete annotations first."
      }, { status: 400 });
    }

    await prisma.group.delete({
      where: { id: _id }
    });

    return NextResponse.json({
      success: true,
      message: "Group deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to delete group: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
