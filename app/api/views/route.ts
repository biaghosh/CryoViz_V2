import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const datasetId = url.searchParams.get("datasetId");

    if (!datasetId) {
      return NextResponse.json({ error: "datasetId is required" }, { status: 400 });
    }

    const views = await prisma.view.findMany({ where: { datasetId } });
    
    // Restore raw map to frontend expectations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedViews = views.map((v: any) => ({
      ...v,
      _id: v.id,
      coords: v.coords ? JSON.parse(v.coords) : null,
      zoom: v.zoom ? JSON.parse(v.zoom) : null,
      pan: v.pan ? JSON.parse(v.pan) : null,
      loadStats: v.loadStats ? JSON.parse(v.loadStats) : []
    }));

    return NextResponse.json({ views: formattedViews }, { status: 200 });
  } catch (error) {
    console.error("Error fetching views:", error);
    return NextResponse.json({ error: "Failed to fetch views" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.coords || !body.zoom || !body.pan || !body.creator || !body.datasetId) {
      return NextResponse.json({ error: "name, coords, zoom, pan, creator, and datasetId are required" }, { status: 400 });
    }

    const userEmail = body.creator;
    const userExists = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!userExists) {
      return NextResponse.json({ error: "User does not exist" }, { status: 400 });
    }

    const view = await prisma.view.create({
      data: {
        name: body.name,
        coords: JSON.stringify(body.coords),
        zoom: JSON.stringify(body.zoom),
        pan: JSON.stringify(body.pan),
        creatorEmail: userEmail,
        datasetId: body.datasetId,
        loadCount: 0,
        loadStats: "[]",
      }
    });

    // Reconstruct for return
    const reconstructedView = {
      ...view,
      _id: view.id,
      coords: body.coords,
      zoom: body.zoom,
      pan: body.pan,
      creator: userEmail,
      loadStats: []
    };

    return NextResponse.json(
      { message: "View saved successfully", view: reconstructedView },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving view:", error);
    return NextResponse.json({ error: "Failed to save view" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, datasetId } = body;

    if (!id || !name || !datasetId) {
      return NextResponse.json({ error: "id, name, and datasetId are required" }, { status: 400 });
    }

    const existing = await prisma.view.findFirst({
      where: { id: id, datasetId }
    });

    if (!existing) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    await prisma.view.update({
      where: { id: id },
      data: { name }
    });

    return NextResponse.json(
      { message: "View name updated successfully", view: { id, name } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating view name:", error);
    return NextResponse.json({ error: "Failed to update view name" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const datasetId = url.searchParams.get("datasetId");

    if (!id || !datasetId) {
      return NextResponse.json({ error: "id and datasetId are required" }, { status: 400 });
    }

    const existing = await prisma.view.findFirst({
      where: { id: id, datasetId }
    });

    if (!existing) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    await prisma.view.delete({
      where: { id }
    });

    return NextResponse.json({ message: "View deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting view:", error);
    return NextResponse.json({ error: "Failed to delete view" }, { status: 500 });
  }
}