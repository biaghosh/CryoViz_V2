import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface Annotation {
  _id?: string;
  id: string; // the frontend unique ID, mapped to annotationId in Prisma
  view: string;
  slice: number;
  x: number;
  y: number;
  text: string;
  instance: number;
  datetime: number;
  user: string;
  datasetId: string;
  status: string;
  groupName?: string;
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

    const annotations = await prisma.annotation.findMany({
      where: {
        datasetId,
        userEmail,
        status: "active"
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedAnnotations = annotations.map((item: any) => ({
      ...item,
      _id: item.id,            // Prisma's cuid maps to MongoDB's _id
      id: item.annotationId,   // Prisma's annotationId maps to frontend's id
      user: item.userEmail,
    }));

    return NextResponse.json(formattedAnnotations, { status: 200 });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to fetch annotations: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const annotation: Annotation = await req.json();

    if (!annotation.text || typeof annotation.text !== "string" || annotation.text.trim() === "") {
      return NextResponse.json({ error: "Annotation text cannot be empty" }, { status: 400 });
    }

    if (!annotation.view || !annotation.slice || !annotation.id || !annotation.datasetId || !annotation.status) {
      return NextResponse.json({ error: "Missing required fields or dataset ID" }, { status: 400 });
    }

    const result = await prisma.annotation.create({
      data: {
        annotationId: annotation.id,
        view: annotation.view,
        slice: annotation.slice,
        x: annotation.x,
        y: annotation.y,
        text: annotation.text,
        instance: annotation.instance,
        userEmail: userEmail,
        datetime: Date.now(),
        datasetId: annotation.datasetId,
        status: "active",
        groupName: annotation.groupName || "Default Group",
      }
    });

    return NextResponse.json({ _id: result.id, id: annotation.id }, { status: 201 });
  } catch (error) {
    console.error("Error saving annotation:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to save annotation: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to save annotation" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const annotation: Partial<Annotation> & { _id?: string; id: string } = await req.json();

    if (!annotation.text || typeof annotation.text !== "string" || annotation.text.trim() === "") {
      return NextResponse.json({ error: "Annotation text cannot be empty" }, { status: 400 });
    }

    if (!annotation._id && !annotation.id) {
      return NextResponse.json({ error: "Missing _id or id" }, { status: 400 });
    }

    if (!annotation.datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    const existingAnnotation = await prisma.annotation.findFirst({
      where: annotation._id
        ? { id: annotation._id, userEmail, datasetId: annotation.datasetId, status: "active" }
        : { annotationId: annotation.id, userEmail, datasetId: annotation.datasetId, status: "active" }
    });

    if (!existingAnnotation) {
      return NextResponse.json({ error: "Annotation not found or not owned by user" }, { status: 404 });
    }

    await prisma.annotation.update({
      where: { id: existingAnnotation.id },
      data: {
        x: annotation.x,
        y: annotation.y,
        text: annotation.text,
        datetime: annotation.datetime || Date.now()
      }
    });

    return NextResponse.json({ message: "Annotation updated successfully", id: annotation.id }, { status: 200 });
  } catch (error) {
    console.error("Error updating annotation:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to update annotation: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to update annotation" }, { status: 500 });
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
    if (!_id) {
      return NextResponse.json({ error: "Missing _id" }, { status: 400 });
    }
    if (!datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    const existing = await prisma.annotation.findFirst({
      where: { id: _id, userEmail, datasetId, status: "active" }
    });

    if (!existing) {
      return NextResponse.json({ error: "Annotation not found or not owned by user" }, { status: 404 });
    }

    await prisma.annotation.delete({
      where: { id: _id }
    });

    return NextResponse.json({ message: "Annotation deleted successfully", _id }, { status: 200 });
  } catch (error) {
    console.error("Error deleting annotation:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to delete annotation: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to delete annotation" }, { status: 500 });
  }
}