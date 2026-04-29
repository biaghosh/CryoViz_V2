"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Institution, User, Dataset } from "@/lib/models";

interface ManageUsersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDataset: Dataset | null;
  selectedAssignedUsers: string[];
  selectedInstitutions: string[];
  users: User[];
  institutions: Institution[];
  handleRemoveUser: (userId: string, datasetId: string) => void;
  handleAssignUsersSubmit: () => void;
  handleUserSelection: (userId: string) => void;  
  setSelectedInstitutions: (institutions: string[]) => void; 
}

export default function ManageUsersDialog({
  isOpen,
  onOpenChange,
  selectedDataset,
  selectedAssignedUsers,
  selectedInstitutions,
  users,
  institutions,
  handleRemoveUser,
  handleAssignUsersSubmit,
  handleUserSelection,
  setSelectedInstitutions,
}: ManageUsersDialogProps) {
  const handleInstitutionChange = (value: string) => {
    const selected = value ? value.split(',').filter((v) => v) : [];
    setSelectedInstitutions(selected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} >
      <DialogContent className="!max-w-fit">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="text-xl font-semibold">Manage Users for {selectedDataset?.name || "Dataset"}</DialogTitle>
        </DialogHeader>
        <div className="flex space-x-2 p-2">
          {/* Assigned Users Section (Left Column) */}
          <div className="w-3/5 p-1">
            <h3 className="text-lg font-medium">Assigned Users</h3>
            <div className="mt-1 max-h-60 overflow-y-auto border rounded-sm p-1">
              {selectedAssignedUsers.length > 0 ? (
                <ul className="list-disc pl-4">
                  {users
                    .filter((user) => selectedAssignedUsers.includes(user._id?.toString() || ""))
                    .map((user) => {
                      const institution = institutions.find(
                        (inst) => inst._id?.toString() === user.institutionId?.toString()
                      );
                      return (
                        <li key={user._id?.toString() || ""} className="flex items-center justify-between py-0.5">
                          <span className="text-sm ">
                            {user.name || user.email} -- {institution ? institution.name : "N/A"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(user._id?.toString() || "", selectedDataset?._id?.toString() || "")}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove user</span>
                          </Button>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="text-sm ">No users assigned.</p>
              )}
            </div>
          </div>

          {/* Assign New Users Section (Right Column) */}
          <div className="w-2/5 p-1">
            <h3 className="text-lg font-medium ">Assign New Users</h3>
            <div className="space-y-2 mt-1">
              <div>
                <label className="block text-sm font-medium">Institutions</label>
                <Select
                  value={selectedInstitutions.join(',')}
                  onValueChange={handleInstitutionChange}
                  // multiple
                >
                  <SelectTrigger className="w-full mt-1 text-sm">
                    <SelectValue placeholder="Select institutions" />
                  </SelectTrigger>
                  <SelectContent className="text-sm">
                    {institutions.map((institution) => (
                      <SelectItem key={institution._id?.toString() || ""} value={institution._id?.toString() || ""}>
                        {institution.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Users</label>
                <div className="mt-1 max-h-60 overflow-y-auto border rounded-sm p-1">
                  {selectedInstitutions.length > 0 ? (
                    users
                      .filter((user) => selectedInstitutions.includes(user.institutionId?.toString() || ""))
                      .map((user) => {
                        const institution = institutions.find(
                          (inst) => inst._id?.toString() === user.institutionId?.toString()
                        );
                        return (
                          <div
                            key={user._id?.toString() || ""}
                            className="flex items-center space-x-1 py-0.5"
                          >
                            <Checkbox
                              id={user._id?.toString() || ""}
                              checked={selectedAssignedUsers.includes(user._id?.toString() || "")}
                              onCheckedChange={() => handleUserSelection(user._id?.toString() || "")}
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor={user._id?.toString() || ""}
                              className="text-sm whitespace-nowrap overflow-hidden text-ellipsis "
                            >
                              {user.name || user.email} -- {institution ? institution.name : "N/A"}
                            </label>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm">Select an institution to view users.</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleAssignUsersSubmit}
                className="w-full mt-2 text-sm"
                disabled={!selectedInstitutions.length}
              >
                Save User Assignments
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}