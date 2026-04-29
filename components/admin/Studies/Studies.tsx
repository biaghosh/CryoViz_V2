"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface Institution {
  _id: string;
  id: string;
  name: string;
  abbr: string;
}

interface Study {
  _id: string;
  id: string;
  name: string;
  poNo: string | null;
  status: string;
  institutionId: string;
  institution: { id: string; name: string; abbr: string };
  createdAt: string;
}

const studySchema = z.object({
  name: z.string().min(1, "Study name is required"),
  poNo: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  institutionId: z.string().min(1, "Institution is required"),
});

type StudyFormData = z.infer<typeof studySchema>;

export default function Studies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studiesRes, adminRes] = await Promise.all([
        fetch("/api/studies"),
        fetch("/api/admin"),
      ]);
      const studiesData = await studiesRes.json();
      const adminData = await adminRes.json();
      setStudies(studiesData.studies || []);
      setInstitutions(adminData.institutions || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const methods = useForm<StudyFormData>({
    resolver: zodResolver(studySchema),
    defaultValues: {
      name: "",
      poNo: "",
      status: "ongoing",
      institutionId: "",
    },
  });

  const { reset, control, handleSubmit } = methods;

  const openCreate = () => {
    setEditingStudy(null);
    reset({ name: "", poNo: "", status: "ongoing", institutionId: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (study: Study) => {
    setEditingStudy(study);
    reset({
      name: study.name,
      poNo: study.poNo || "",
      status: study.status,
      institutionId: study.institutionId,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StudyFormData) => {
    try {
      if (editingStudy) {
        const res = await fetch("/api/studies", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingStudy._id, ...data }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to update study");
          return;
        }
      } else {
        const res = await fetch("/api/studies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to create study");
          return;
        }
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving study:", error);
      alert("Error saving study");
    }
  };

  const handleDelete = async (study: Study) => {
    if (confirm(`Are you sure you want to delete study "${study.name}"?`)) {
      try {
        const res = await fetch("/api/studies", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: study._id }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to delete study");
          return;
        }
        fetchData();
      } catch (error) {
        console.error("Error deleting study:", error);
        alert("Error deleting study");
      }
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      complete: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      ongoing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      incomplete: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns: ColumnDef<Study>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Study Name</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
    },
    {
      accessorKey: "poNo",
      header: "PO No",
      cell: ({ row }) => row.original.poNo || "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: "institutionId",
      header: "Institution",
      cell: ({ row }) => row.original.institution?.name || "N/A",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Created</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const study = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gray-200">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(study)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(study)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: studies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: { pagination: { pageSize: 10 } },
  });

  if (loading) return <div className="p-4">Loading studies...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search studies..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Study
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStudy ? "Edit Study" : "New Study"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Study Name</label>
                  <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <>
                        <Input {...field} className="mt-1" />
                        {fieldState.error && (
                          <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">PO Number</label>
                  <Controller
                    control={control}
                    name="poNo"
                    render={({ field }) => <Input {...field} className="mt-1" placeholder="Optional" />}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field, fieldState }) => (
                      <>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="incomplete">Incomplete</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldState.error && (
                          <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Institution</label>
                  <Controller
                    control={control}
                    name="institutionId"
                    render={({ field, fieldState }) => (
                      <>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select institution" />
                          </SelectTrigger>
                          <SelectContent>
                            {institutions.map((inst) => (
                              <SelectItem key={inst._id} value={inst._id}>
                                {inst.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.error && (
                          <p className="text-red-500 text-sm mt-1">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingStudy ? "Update" : "Create"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No studies found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
        <span className="text-sm">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
      </div>
    </div>
  );
}
