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
import InstitutionForm, { FormData } from "./InstitutionForm";
import UserForm, { FormData as UserFormData } from "../Users/UserForm";
import { User } from "@/lib/models";

interface Institution {
  _id: string;
  name: string;
  abbr: string;
  type: "Industry" | "Government" | "Academic" | "Others";
  address: string;
  phone: string;
  email: string;
  website: string;
  status: "Active" | "Inactive" | "Hold";
  createdAt: Date;
}

export default function Institutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);
  const [, setUsers] = useState<User[]>([]);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin");
      const data = await response.json();
      setInstitutions(data.institutions || []);
    } catch (error) {
      console.error("Failed to fetch institutions:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin");
      const data = await response.json();
      setUsers(data.users || []);
      setInstitutions(data.institutions || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const columns: ColumnDef<Institution>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Name</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="truncate" title={row.original.name}>
          {row.original.name}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: "abbr",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Abbr</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="truncate" title={row.original.abbr}>
          {row.original.abbr}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Type</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="truncate" title={row.original.type}>
          {row.original.type}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="truncate" title={row.original.email}>
          {row.original.email}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Status</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const statusStyles = {
          Active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
          Inactive: "bg-red-500/10 text-red-500 border-red-500/20",
          Hold: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        };
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[status] || "bg-muted text-muted-foreground"}`}>
            {status}
          </span>
        );
      },
      size: 90,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const institution = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleView(institution)}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(institution)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(institution._id, institution.name)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ];

  const table = useReactTable({
    data: institutions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleView = (institution: Institution) => {
    setSelectedInstitution(institution);
    setIsViewOpen(true);
  };

  const handleEdit = (institution: Institution) => {
    setSelectedInstitution(institution);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const response = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "delete-institution" }),
      });
      if (response.ok) {
        fetchInstitutions();
        setIsViewOpen(false);
      } else {
        alert("Failed to delete institution");
      }
    }
  };

  const onSubmit = async (data: Institution) => {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "institution" }),
      });
      if (response.ok) {
        fetchInstitutions();
      } else {
        alert("Failed to create institution");
      }
    } catch (error) {
      console.error("Error creating institution:", error);
      alert("Error creating institution");
    }
  };
  const onSubmitUser = async (data: User) => {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "user" }),
      });
      const result = await response.json();
      if (response.ok) {
        fetchUsers();
      } else {
        alert(result.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error creating user");
    }
  };

  const handleUpdate = async (data: Institution) => {
    try {
      const response = await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "update-institution" }),
      });
      if (response.ok) {
        fetchInstitutions();
        setIsEditOpen(false);
      } else {
        alert("Failed to update institution");
      }
    } catch (error) {
      console.error("Error updating institution:", error);
      alert("Error updating institution");
    }
  };

  if (loading) return <div className="p-4">Loading institutions...</div>;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <Input
          placeholder="Search institutions..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-shrink-0">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New Institution
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedInstitution ? "Edit Institution" : "New Institution"}
                </DialogTitle>
              </DialogHeader>
              <InstitutionForm
                onSubmit={(data: FormData) =>
                  selectedInstitution
                    ? handleUpdate(data as Institution)
                    : onSubmit(data as Institution)
                }
                defaultValues={
                  selectedInstitution
                    ? {
                        name: selectedInstitution.name,
                        abbr: selectedInstitution.abbr,
                        type: selectedInstitution.type,
                        email: selectedInstitution.email,
                        status: selectedInstitution.status,
                        _id: selectedInstitution._id,
                        address: selectedInstitution.address,
                        phone: selectedInstitution.phone,
                        website: selectedInstitution.website,
                      }
                    : undefined
                }
              />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{"New User"}</DialogTitle>
              </DialogHeader>
              <UserForm
                onSubmit={(data: UserFormData) =>
                  onSubmitUser(data as unknown as User)
                }
                defaultValues={undefined}
                institutions={institutions}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-md border overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="truncate"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
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
                    <TableCell key={cell.id} className="truncate">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No institutions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
        <span className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  Show {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {selectedInstitution && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md rounded-md border border-gray-200 p-6 shadow-sm sm:max-w-lg dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedInstitution.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Abbreviation
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.abbr}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Type
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.type}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Address
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.address || "N/A"}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Phone
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.phone || "N/A"}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Email
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.email}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Website
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.website || "N/A"}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {selectedInstitution.status}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="grid grid-cols-[100px_1fr] gap-x-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Created At
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200">
                    {new Date(
                      selectedInstitution.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-2">
              <Button
                variant="outline"
                className="rounded-md border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                onClick={() => {
                  setIsViewOpen(false);
                  handleEdit(selectedInstitution);
                }}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                onClick={() =>
                  handleDelete(
                    selectedInstitution._id,
                    selectedInstitution.name
                  )
                }
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
