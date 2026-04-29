// components/userDatasets/userDatasets.tsx
"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";

import { Dataset, Institution, User } from "@/lib/models";
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
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

type AdminDataResult = {
  institutions: Institution[];
  users: User[];
  datasets: Dataset[];
  currentUser: User;
  studies: any[]; // Added studies to the type
};

export default function UsersDatasets() {
  const { data: session, status } = useSession();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const { data: baseData, isLoading } = useQuery<AdminDataResult>({
    queryKey: ["adminData", session?.user?.email],
    enabled: status === "authenticated",
    queryFn: async (): Promise<AdminDataResult> => {
      // Fetch both admin data and studies to resolve names
      const [adminRes, studiesRes] = await Promise.all([
        fetch("/api/admin"),
        fetch("/api/studies")
      ]);
      
      const result = await adminRes.json();
      const studiesData = await studiesRes.json();

      const currentUser = result.users?.find((u: User) => u.email === session?.user?.email);
      let filteredDatasets = result.datasets || [];

      if (currentUser?.accessLevel !== "admin") {
        const assigned = new Set(currentUser?.assignedDatasets || []);
        filteredDatasets = filteredDatasets.filter((d: Dataset) =>
          assigned.has(d._id?.toString() || "")
        );
      }

      return {
        institutions: result.institutions || [],
        users: result.users || [],
        datasets: filteredDatasets,
        currentUser,
        studies: studiesData.studies || [],
      };
    },
  });

  const datasets = baseData?.datasets ?? [];

  // Table Column Definitions organized as: Name, Institution, Description, Study
  const columns = React.useMemo<ColumnDef<Dataset>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 hover:bg-transparent font-bold"
          >
            Name
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Link 
            href={`/home?datasetId=${row.original._id}`} 
            className="text-blue-600 hover:underline font-bold transition-colors"
          >
            {row.getValue("name")}
          </Link>
        ),
      },
      {
  id: "institution",
  header: "Institution",
  cell: ({ row }) => {
    const dataset = row.original;
    
    // 1. Check if the API already nested the institution object (Best Performance)
    if (dataset.institution?.name) return dataset.institution.name;

    // 2. Fallback: Find in the baseData list using string comparison
    const instMatch = baseData?.institutions.find(
      (i) => (i._id || i.id)?.toString() === dataset.institutionId?.toString()
    );
    
    return instMatch ? instMatch.name : "N/A";
  },
},
{
  id: "study",
  header: "Study",
  cell: ({ row }) => {
    const dataset = row.original;

    // 1. Check if nested study object exists
    if (dataset.study?.name) return dataset.study.name;

    // 2. Fallback: Find in the fetched studies list
    const studyMatch = baseData?.studies?.find(
      (s) => (s._id || s.id)?.toString() === dataset.studyId?.toString()
    );
    
    return studyMatch ? studyMatch.name : "N/A";
  },
},
      {
        id: "actions",
        header: () => <div className="text-right">Action</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Link href={`/home?datasetId=${row.original._id}`}>
                View
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [baseData?.institutions, baseData?.studies]
  );

  const table = useReactTable({
    data: datasets,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (isLoading) return <div className="p-10 text-center">Loading datasets...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Datasets</h1>
          <p className="text-muted-foreground">Click a dataset name to view visualization.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-4 font-bold text-black">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-blue-50/20 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No datasets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Total: <strong>{datasets.length}</strong> datasets
        </div>
        
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}