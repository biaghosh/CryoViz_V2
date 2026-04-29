import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const datasetId = url.searchParams.get("datasetId");
    const { user } = await req.json();

    if (!id || !user || !datasetId) {
      return NextResponse.json({ error: "id, user, and datasetId are required" }, { status: 400 });
    }

    const view = await prisma.view.findFirst({
      where: { id: id, datasetId: datasetId }
    });
    
    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    const loadStats = view.loadStats ? JSON.parse(view.loadStats) : [];
    const userStat = loadStats.find((stat: { user: string }) => stat.user === user);
    const updatedStats = userStat
      ? loadStats.map((stat: { user: string; count: number; lastLoad: string | Date }) =>
          stat.user === user
            ? { ...stat, count: stat.count + 1, lastLoad: new Date() }
            : stat
        )
      : [...loadStats, { user, count: 1, lastLoad: new Date() }];

    const result = await prisma.view.update({
      where: { id: id },
      data: {
        loadCount: view.loadCount + 1,
        loadStats: JSON.stringify(updatedStats),
      }
    });

    const reconstructedView = {
      ...result,
      _id: result.id,
      loadStats: updatedStats,
      coords: result.coords ? JSON.parse(result.coords) : null,
      pan: result.pan ? JSON.parse(result.pan) : null
    };

    return NextResponse.json(
      { message: "View loaded successfully", view: reconstructedView },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error loading view:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(toJsonErr(error), { status: 500 });
  }
}