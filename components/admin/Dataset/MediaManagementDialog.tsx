"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Dataset } from "@/lib/models";
import { useSession } from "next-auth/react";

const uploadMediaSchema = z.object({
  datasetId: z.string().min(1, "Dataset is required"),
  file: z.any().refine((val) => val?.length > 0, "File is required"),
});

type UploadMediaForm = z.infer<typeof uploadMediaSchema>;

interface MediaManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDataset: Dataset | null;
  fetchMedia: (datasetId: string) => Promise<void>;
}

export default function MediaManagementDialog({
  isOpen,
  onOpenChange,
  selectedDataset,
  fetchMedia,
}: MediaManagementDialogProps) {
  const [mediaFiles, setMediaFiles] = useState<{ id: string; name: string; url: string }[]>([]);
  const { data: session } = useSession();
  const userId = session?.user?.email;

  const mediaMethods = useForm<UploadMediaForm>({
    resolver: zodResolver(uploadMediaSchema),
    defaultValues: {
      datasetId: "",
      file: null,
    },
  });

  const { reset: resetMedia, handleSubmit: handleMediaSubmit } = mediaMethods;

  useEffect(() => {
    if (isOpen && selectedDataset?._id) {
      fetchMedia(selectedDataset._id.toString()).then(() => {
        const fetchMediaList = async () => {
          try {
            const response = await fetch(`/api/media?dataset=${selectedDataset._id}`);
            if (!response.ok) throw new Error("Failed to fetch media");
            const data = await response.json();
            setMediaFiles(data.files || []);
          } catch (error) {
            console.error("Error fetching media list:", error);
            setMediaFiles([]);
          }
        };
        fetchMediaList();
      });
    }
  }, [isOpen, selectedDataset, fetchMedia]);

  useEffect(() => {
    if (selectedDataset) {
      resetMedia({
        datasetId: selectedDataset._id?.toString() || "",
        file: null,
      });
    }
  }, [selectedDataset, resetMedia]);

  const onUploadMediaSubmit = async (data: UploadMediaForm) => {
    if (!selectedDataset || !selectedDataset._id) {
      alert("No dataset selected");
      return;
    }

    try {
      const file = data.file[0];
      if (!file) {
        alert("Please select a file to upload");
        return;
      }

      const sasResponse = await fetch(`/api/media/sas?dataset=${selectedDataset._id}&filename=${file.name}`);
      if (!sasResponse.ok) {
        const errorData = await sasResponse.json();
        throw new Error(errorData.error || "Failed to generate SAS URL");
      }
      const { sasUrl } = await sasResponse.json();

      const uploadResponse = await fetch(sasUrl, {
        method: "PUT",
        body: file,
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      // Include additional required fields
      const currentDate = new Date().toISOString();
      const metadata = {
        dataset: selectedDataset._id.toString(),
        filename: file.name,
        url: sasUrl.split("?")[0], // Base URL without SAS token
        chunkSize: file.size,
        length: file.size,
        type: file.type, // Added MIME type
        createdAt: currentDate, // Added timestamp
        format: file.type,
        user: userId,  // Added user ID    
      };

      console.log("Sending metadata:", metadata); // Debug log

      const metadataResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        console.error("API Error Response:", errorData);
        throw new Error(errorData.error || "Failed to save metadata");
      }

      await fetchMedia(selectedDataset._id.toString());
      alert("Media uploaded successfully");
      resetMedia();
    } catch (error) {
      console.error("Error uploading media:", error instanceof Error ? error.message : "Unknown error");
      alert(`Error uploading media: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDeleteMedia = async (filename: string) => {
    if (!selectedDataset || !selectedDataset._id) {
      alert("No dataset selected");
      return;
    }

    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      try {
        const response = await fetch(`/api/media?dataset=${selectedDataset._id}&filename=${filename}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete media");
        }
        await fetchMedia(selectedDataset._id.toString());
        alert("Media deleted successfully");
        } catch (error) {
        console.error("Error deleting media:", error instanceof Error ? error.message : "Unknown error");
        alert(`Error deleting media: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[50vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Media for {selectedDataset?.name || "Dataset"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          {/* Media List */}
          <div>
            <h3 className="text-lg font-medium ">Uploaded Media</h3>
            {mediaFiles.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {mediaFiles.map((file) => (
                  <li key={file.id} className="flex items-center justify-between">
                    <span className="text-sm ">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMedia(file.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete {file.name}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No media uploaded for this dataset.</p>
            )}
          </div>

          {/* Upload Form */}
          <FormProvider {...mediaMethods}>
            <form onSubmit={handleMediaSubmit(onUploadMediaSubmit)} className="space-y-4">
              {/* <div>
                <label className="block text-sm font-medium     ">Dataset</label>
                <Input
                  value={watch("datasetId") || ""}
                  readOnly
                  className="mt-1 w-full"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium ">File</label>
                <Input
                  type="file"
                  onChange={(e) => mediaMethods.setValue("file", e.target.files)}
                  className="mt-1 w-full"
                />
              </div>
              <Button type="submit" className="w-full">
                <Upload className="mr-2 h-4 w-4" /> Upload Media
              </Button>
            </form>
          </FormProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}