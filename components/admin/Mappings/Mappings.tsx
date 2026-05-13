"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dataset, DatasetMapping } from "@/lib/models";
import { SortableItem } from "@/components/admin/Mappings/sortable-item"; // small wrapper using dnd-kit useSortable
import { toast } from "sonner";

export default function DatasetMappingsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [parentId, setParentId] = useState<string>("");
  const [children, setChildren] = useState<
    { datasetId: string; alias?: string; order?: number }[]
  >([]);
  const [search, setSearch] = useState("");
  const [mappingId, setMappingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<DatasetMapping[]>([]);

  // load base data
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin");
      const json = await res.json();
      setDatasets(json.datasets || []);
    })();
  }, []);

  const getDatasetName = useCallback((id: string) =>
  datasets.find((d: any) => (d.id || d._id)?.toString() === id)?.name || "Unknown", [datasets]);

  // load mapping when parent changes
  useEffect(() => {
    if (!parentId) {
      setChildren([]);
      setMappingId(null);
      return;
    }
    (async () => {
      const res = await fetch(`/api/dataset-mappings?parentId=${parentId}`);
      const json = await res.json();
      const mapping: DatasetMapping | null = json.mapping || null;
      setMappingId((mapping as any)?.id || (mapping as any)?._id || null);
      setChildren(
      (mapping?.children || [])
        .filter(c => !!c.datasetId) // Filter out any undefined IDs first
        .map((c, idx) => ({
          datasetId: c.datasetId as string, // Assert that it exists now
          alias: c.alias || getDatasetName(c.datasetId as string),
          order: c.order ?? idx,
        }))
    );
    })();
  }, [parentId, getDatasetName]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dataset-mappings");
      const json = await res.json();
      setMappings(json.mappings || []);
    })();
  }, []);

  const refreshMappings = async () => {
    const r = await fetch("/api/dataset-mappings");
    const j = await r.json();
    setMappings(j.mappings || []);
  };
  const mappedChildIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of mappings) {
      // Only add if datasetId is truthy
      for (const c of m.children || []) {
        if (c.datasetId) s.add(c.datasetId);
      }
    }
    return s;
  }, [mappings]);

  const parentIdsWithMapping = useMemo(
    () => new Set(mappings.map((m) => m.parentId).filter((id): id is string => !!id)),
    [mappings]
  );


  const filteredPool = useMemo(() => {
    const term = search.trim().toLowerCase();
    const chosenSet = new Set(children.map((c) => c.datasetId));
    return datasets
      .filter((d: any) => {
        const dId = (d.id || d._id)?.toString();
        if (!dId) return false;
        return (
          dId !== parentId &&
          !chosenSet.has(dId) &&
          !mappedChildIds.has(dId) &&
          !parentIdsWithMapping.has(dId) &&
          (!term || d.name.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [datasets, parentId, children, search, mappedChildIds, parentIdsWithMapping]);

  const addChild = (datasetId: string) => {
    if (!datasetId || datasetId === parentId) return;
    if (children.some((c) => c.datasetId === datasetId)) return;
    setChildren((prev) => [
      ...prev,
      { datasetId, alias: getDatasetName(datasetId), order: prev.length },
    ]);
  };

  const removeChild = (datasetId: string) => {
    setChildren((prev) => prev.filter((c) => c.datasetId !== datasetId));
  };

  const save = async () => {
    if (!parentId) { toast.error("Select a parent dataset first"); return; }
    setSaving(true);
    try {
      const payload = { parentId, children };
      const res = await fetch("/api/dataset-mappings", {
        method: mappingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappingId ? { id: mappingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save mapping");
      if (!mappingId && json.id) setMappingId(json.id);
      await refreshMappings(); // NEW
      toast.success("Mapping saved");
      } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: pool */}
      <Card className="lg:col-span-5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">All Datasets</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="max-w-xs"
          />
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredPool.map((d: any) => {
            const dId = (d.id || d._id).toString();
            return (
              <div
                key={dId}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <span className="truncate">{d.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addChild(dId)}
                >
                  Add
                </Button>
              </div>
            );
          })}
          {filteredPool.length === 0 && (
            <div className="text-sm text-muted-foreground">No datasets</div>
          )}
        </div>
      </Card>

      {/* Right: parent + children */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Existing Mappings</h2>
            <span className="text-sm text-muted-foreground">
              {mappings.length} total
            </span>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {mappings.map((m: any) => {
              const mId = (m.id || m._id).toString();
              const parent = datasets.find(
                (d: any) => (d.id || d._id)?.toString() === m.parentId
              );
              return (
                <div key={mId} className="border rounded-md px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">
                      {parent ? parent.name : "(Parent not found)"}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setParentId(m.parentId)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm("Delete this mapping?")) return;
                          const res = await fetch("/api/dataset-mappings", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: mId }),
                          });
                          if (res.ok) {
                            if (parentId === m.parentId) {
                              setParentId("");
                              setChildren([]);
                              setMappingId(null);
                            }
                            await refreshMappings();
                            toast.success("Mapping deleted");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {m.children?.length ? (
                    <ul className="mt-2 text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                      {m.children.slice(0, 5).map((c: any) => {
                        const d = datasets.find((x: any) => (x.id || x._id)?.toString() === c.datasetId);
                        return (
                          <li key={c.datasetId} className="truncate">
                            {c.alias || d?.name || c.datasetId}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Select Parent */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Select Parent</h2>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a parent dataset" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {datasets.map((d: any) => {
                const dId = (d.id || d._id).toString();
                return (
                  <SelectItem key={dId} value={dId}>
                    {d.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </Card>

        {/* Children */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Children</h2>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Mapping"}
            </Button>
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              const oldIndex = children.findIndex(
                (c) => c.datasetId === active.id
              );
              const newIndex = children.findIndex(
                (c) => c.datasetId === over.id
              );
              const newArr = arrayMove(children, oldIndex, newIndex).map(
                (c, idx) => ({ ...c, order: idx })
              );
              setChildren(newArr);
            }}
          >
            <SortableContext
              items={children.map((c) => c.datasetId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {children.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Drag or add datasets as children.
                  </div>
                )}
                {children.map((c) => (
                  <SortableItem key={c.datasetId} id={c.datasetId}>
                    <div className="flex items-center gap-3 border rounded-md p-3">
                      <div className="grow">
                        <div className="text-sm font-medium">
                          {getDatasetName(c.datasetId)}
                        </div>
                        <Input
                          className="mt-1"
                          placeholder="Child display name (alias)"
                          value={c.alias ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setChildren((prev) =>
                              prev.map((x) =>
                                x.datasetId === c.datasetId
                                  ? { ...x, alias: v }
                                  : x
                              )
                            );
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeChild(c.datasetId)}
                      >
                        ✕
                      </Button>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </Card>
      </div>
    </div>
  );
}
